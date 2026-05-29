// YeriaKeyStore — provider-side helper for resolving the JWT `kid` header
// of inbound Yeria-issued user tokens.
//
// The store fetches keys from `GET /api/v1/public/registry/public-keys/{kid}`
// on demand, caches the result in memory, and only ever returns a PEM
// when the key is still trusted (state ∈ {active, rotating}). Expired /
// unknown keys are negatively cached so a flood of bad tokens does not
// hammer Yeria.
//
// Providers wire it into their own auth middleware:
//
//   import { YeriaApp, YeriaKeyStore } from '@numerum-tech/yeriasdk';
//
//   const keys = new YeriaKeyStore({ baseUrl: process.env.YERIA_BASE_URL });
//
//   const claims = await YeriaApp.verifyUserTokenWithResolver(
//       bearer,
//       (kid) => keys.getByKid(kid),
//       MY_SERVICE_ID
//   );
//
// The SDK never reaches out to Yeria on its own — every network call
// flows through a fetch implementation the caller can swap (tests,
// non-Node runtimes).

export type KeyState = 'active' | 'rotating' | 'expired' | 'unknown';

export interface KeyLookup {
    state: KeyState;
    publicKey: string | null; // PEM, present only for active/rotating
    expiresAt: string | null; // ISO timestamp, present only for active/rotating
}

export interface YeriaKeyStoreOptions {
    /**
     * Base URL of the Yeria platform — e.g. `https://yeria.app`. Trailing
     * slash optional. The store appends `/api/v1/public/registry/...`.
     */
    baseUrl: string;
    /**
     * Cache lifetime per kid, in milliseconds. Default 10 minutes.
     * Applies to both positive (PEM) and negative (expired/unknown)
     * cache entries.
     */
    ttlMs?: number;
    /**
     * Inject a `fetch` implementation. Defaults to the global `fetch` —
     * Node 18+ ships it natively. Tests override to avoid real HTTP.
     */
    fetch?: typeof fetch;
}

interface CacheEntry {
    lookup: KeyLookup;
    expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export class YeriaKeyStore {
    private readonly baseUrl: string;
    private readonly ttlMs: number;
    private readonly fetchImpl: typeof fetch;
    private readonly cache = new Map<string, CacheEntry>();

    constructor(opts: YeriaKeyStoreOptions) {
        if (!opts || !opts.baseUrl) {
            throw new Error('YeriaKeyStore: baseUrl is required');
        }
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
        this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
        const f = opts.fetch ?? globalThis.fetch;
        if (typeof f !== 'function') {
            throw new Error(
                'YeriaKeyStore: no fetch available — pass opts.fetch on Node < 18 or non-browser runtimes',
            );
        }
        this.fetchImpl = f.bind(globalThis);
    }

    /**
     * Resolve a kid to a PEM. Returns null when the key is expired or
     * unknown — the caller should reject the inbound token in that case.
     */
    async getByKid(kid: string): Promise<string | null> {
        const lookup = await this.lookup(kid);
        return lookup.publicKey;
    }

    /**
     * Resolve a kid to its full trust state. Same network/cache behaviour
     * as `getByKid` — exposed for callers that want to log / branch on
     * the state.
     */
    async getState(kid: string): Promise<KeyState> {
        const lookup = await this.lookup(kid);
        return lookup.state;
    }

    /** Drop a single cache entry. Use after a verify failure to force a
     *  refetch on the retry — covers the case where Yeria rotated a key
     *  out from under our cache. */
    invalidate(kid: string): void {
        this.cache.delete(kid);
    }

    /** Drop the entire cache. */
    invalidateAll(): void {
        this.cache.clear();
    }

    private async lookup(kid: string): Promise<KeyLookup> {
        if (typeof kid !== 'string' || kid.length === 0) {
            return { state: 'unknown', publicKey: null, expiresAt: null };
        }
        const now = Date.now();
        const cached = this.cache.get(kid);
        if (cached && cached.expiresAt > now) {
            return cached.lookup;
        }

        const lookup = await this.fetchFromYeria(kid);
        this.cache.set(kid, { lookup, expiresAt: now + this.ttlMs });
        return lookup;
    }

    private async fetchFromYeria(kid: string): Promise<KeyLookup> {
        const url = `${this.baseUrl}/api/v1/public/registry/public-keys/${encodeURIComponent(kid)}`;
        let res: Response;
        try {
            res = await this.fetchImpl(url, { method: 'GET' });
        } catch (e) {
            // Network failure — surface as `unknown` so the caller rejects
            // the inbound token without caching the result for long.
            // We still cache briefly (the TTL) to avoid hot-looping.
            return { state: 'unknown', publicKey: null, expiresAt: null };
        }

        // Yeria returns 404 for unknown kid + 200 with state otherwise.
        // The body shape is the same on success and on the 404 case
        // (`{state, key_id, [public_key, ...]}`) wrapped in
        // `{success, message, result}` by the platform's jsonSuccess /
        // jsonFail helpers.
        let body: unknown;
        try {
            body = await res.json();
        } catch (_e) {
            return { state: 'unknown', publicKey: null, expiresAt: null };
        }

        const result = extractResult(body);
        if (!result) {
            return { state: 'unknown', publicKey: null, expiresAt: null };
        }

        const state = (result['state'] as KeyState) || 'unknown';
        if (state === 'active' || state === 'rotating') {
            return {
                state,
                publicKey: typeof result['public_key'] === 'string' ? result['public_key'] as string : null,
                expiresAt: typeof result['expires_at'] === 'string' ? result['expires_at'] as string : null,
            };
        }
        return { state, publicKey: null, expiresAt: null };
    }
}

/** Extract `result` from a `{success, message, result}` envelope, or fall
 *  back to the top-level object when the platform returned a state-only
 *  body without the wrapper. */
function extractResult(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    if (b['result'] && typeof b['result'] === 'object') {
        return b['result'] as Record<string, unknown>;
    }
    // Some jsonFail paths return the result fields at the top level.
    if (typeof b['state'] === 'string') return b;
    return null;
}
