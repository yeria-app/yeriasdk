// YeriaPublicKeys — provider-side helper for resolving the JWT `kid` header
// of inbound Yeria-issued user tokens.
//
// The store fetches keys from `GET /api/v1/public/registry/public-keys/{kid}`
// on demand, caches the result in memory, and only ever returns a PEM
// when the key is still trusted (state ∈ {active, rotating}). Expired /
// unknown keys are negatively cached so a flood of bad tokens does not
// hammer Yeria.
//
// A failure to REACH Yeria (network error, timeout, 5xx, non-JSON error
// page) is kept strictly separate from an authoritative "key not trusted"
// answer: it surfaces as state `unreachable` and, through `getByKid`, as a
// thrown `YeriaPlatformUnreachableError`. That lets provider middleware
// answer 503 ("cannot verify right now") instead of 401 ("token invalid").
// Unreachable results use a short cache TTL so a transient blip does not
// reject every token for the full positive TTL.
//
// Providers wire it into their own auth middleware:
//
//   import { YeriaApp, YeriaPublicKeys } from '@numerum-tech/yeriasdk';
//
//   const keys = new YeriaPublicKeys({ baseUrl: process.env.YERIA_BASE_URL });
//
//   const claims = await YeriaApp.verifyYeriaTokenWithResolver(
//       bearer,
//       (kid) => keys.getByKid(kid),
//       MY_SERVICE_ID
//   );
//
// The SDK never reaches out to Yeria on its own — every network call
// flows through a fetch implementation the caller can swap (tests,
// non-Node runtimes).

// Trust state of a `kid`:
//   active/rotating — key is trusted, PEM returned.
//   expired         — key was issued by Yeria but is past its validity;
//                     the token must be rejected (a decision was made).
//   unknown         — Yeria answered authoritatively that it holds no such
//                     kid; the token must be rejected.
//   unreachable     — the SDK could NOT reach Yeria (network, timeout, 5xx,
//                     non-JSON error page). No trust decision was possible.
//                     Distinct from unknown/expired on purpose: this is a
//                     transport problem, not a verdict on the key.
import { YeriaPlatformUnreachableError } from '../errors';

export type KeyState = 'active' | 'rotating' | 'expired' | 'unknown' | 'unreachable';

export interface KeyLookup {
    state: KeyState;
    publicKey: string | null; // PEM, present only for active/rotating
    expiresAt: string | null; // ISO timestamp, present only for active/rotating
    // Populated only when state === 'unreachable' — carries why the platform
    // could not be reached so getByKid can raise a precise error.
    reason?: 'network' | 'http_error' | 'malformed_response';
    statusCode?: number;
    cause?: Error;
}

export interface YeriaPublicKeysOptions {
    /**
     * Base URL of the Yeria platform — e.g. `https://yeria.app`. Trailing
     * slash optional. The store appends `/api/v1/public/registry/...`.
     */
    baseUrl: string;
    /**
     * Cache lifetime per kid, in milliseconds. Default 10 minutes.
     * Applies to positive (PEM) and authoritative-negative (expired/unknown)
     * cache entries — NOT to `unreachable`, which uses `errorTtlMs`.
     */
    ttlMs?: number;
    /**
     * Cache lifetime for `unreachable` results, in milliseconds. Default 5s.
     * Kept short on purpose: a transient network blip must not poison the
     * cache for the full `ttlMs` and fail every token for 10 minutes. Short
     * enough to recover fast, long enough to avoid hot-looping Yeria under a
     * flood of tokens while it is down.
     */
    errorTtlMs?: number;
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
const DEFAULT_ERROR_TTL_MS = 5 * 1000;

export class YeriaPublicKeys {
    private readonly baseUrl: string;
    private readonly ttlMs: number;
    private readonly errorTtlMs: number;
    private readonly fetchImpl: typeof fetch;
    private readonly cache = new Map<string, CacheEntry>();

    constructor(opts: YeriaPublicKeysOptions) {
        if (!opts || !opts.baseUrl) {
            throw new Error('YeriaPublicKeys: baseUrl is required');
        }
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
        this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
        this.errorTtlMs = opts.errorTtlMs ?? DEFAULT_ERROR_TTL_MS;
        const f = opts.fetch ?? globalThis.fetch;
        if (typeof f !== 'function') {
            throw new Error(
                'YeriaPublicKeys: no fetch available — pass opts.fetch on Node < 18 or non-browser runtimes',
            );
        }
        this.fetchImpl = f.bind(globalThis);
    }

    /**
     * Resolve a kid to a PEM.
     *
     *   - active/rotating → the PEM string.
     *   - expired/unknown → `null`. Yeria answered authoritatively that the
     *     key is not trusted; the caller must REJECT the token (401).
     *   - unreachable     → throws {@link YeriaPlatformUnreachableError}. The
     *     SDK could not reach Yeria, so no trust decision was possible; the
     *     caller must surface a 503, NOT a 401. Wired as a resolver into
     *     `verifyYeriaTokenWithResolver`, this throw propagates out of verify
     *     so provider middleware can tell "cannot verify" from "invalid".
     */
    async getByKid(kid: string): Promise<string | null> {
        const lookup = await this.lookup(kid);
        if (lookup.state === 'unreachable') {
            throw new YeriaPlatformUnreachableError(
                kid,
                this.urlFor(kid),
                lookup.reason ?? 'network',
                lookup.statusCode,
                lookup.cause,
            );
        }
        return lookup.publicKey;
    }

    /**
     * Resolve a kid to its full trust state, INCLUDING `unreachable`. Same
     * network/cache behaviour as `getByKid` but never throws — exposed for
     * callers that want to log / branch on the state (e.g. distinguish a
     * platform outage from a genuinely unknown key without a try/catch).
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

    private urlFor(kid: string): string {
        return `${this.baseUrl}/api/v1/public/registry/public-keys/${encodeURIComponent(kid)}`;
    }

    private async lookup(kid: string): Promise<KeyLookup> {
        if (typeof kid !== 'string' || kid.length === 0) {
            // Malformed input, not a platform problem — authoritative reject.
            return { state: 'unknown', publicKey: null, expiresAt: null };
        }
        const now = Date.now();
        const cached = this.cache.get(kid);
        if (cached && cached.expiresAt > now) {
            return cached.lookup;
        }

        const lookup = await this.fetchFromYeria(kid);
        // Transient (unreachable) results get the short error TTL so a blip
        // does not fail every token for the full ttlMs; authoritative
        // results (active/rotating/expired/unknown) get the normal TTL.
        const ttl = lookup.state === 'unreachable' ? this.errorTtlMs : this.ttlMs;
        this.cache.set(kid, { lookup, expiresAt: now + ttl });
        return lookup;
    }

    private async fetchFromYeria(kid: string): Promise<KeyLookup> {
        const url = this.urlFor(kid);
        let res: Response;
        try {
            res = await this.fetchImpl(url, { method: 'GET' });
        } catch (e) {
            // Transport failure (DNS, connection refused, timeout). Yeria was
            // never reached — we cannot decide anything about the key.
            return {
                state: 'unreachable', publicKey: null, expiresAt: null,
                reason: 'network', cause: e instanceof Error ? e : undefined,
            };
        }

        // Yeria answers 200 with a state body for a known kid and 404 (still a
        // well-formed body) for a genuinely unknown one. Any OTHER non-2xx
        // (5xx, 502/503 gateway pages, 429, …) is the platform failing to
        // answer — treat as unreachable, not as an authoritative verdict.
        if (!res.ok && res.status !== 404) {
            return {
                state: 'unreachable', publicKey: null, expiresAt: null,
                reason: 'http_error', statusCode: res.status,
            };
        }

        // The body shape is the same on 200 and on the 404 case
        // (`{state, key_id, [public_key, ...]}`) wrapped in
        // `{success, message, result}` by the platform's jsonSuccess /
        // jsonFail helpers. A body that will not parse as JSON (e.g. an HTML
        // error page served by a proxy in front of Yeria) is NOT a trustworthy
        // "unknown" — treat it as the platform being unreachable.
        let body: unknown;
        try {
            body = await res.json();
        } catch (_e) {
            return {
                state: 'unreachable', publicKey: null, expiresAt: null,
                reason: 'malformed_response', statusCode: res.status,
            };
        }

        const result = extractResult(body);
        if (!result) {
            return {
                state: 'unreachable', publicKey: null, expiresAt: null,
                reason: 'malformed_response', statusCode: res.status,
            };
        }

        const rawState = result['state'];
        // A body without a recognisable state is a broken contract, not an
        // authoritative "unknown" — surface it as unreachable so it is never
        // silently cached as a hard token rejection.
        if (rawState !== 'active' && rawState !== 'rotating'
            && rawState !== 'expired' && rawState !== 'unknown') {
            return {
                state: 'unreachable', publicKey: null, expiresAt: null,
                reason: 'malformed_response', statusCode: res.status,
            };
        }

        if (rawState === 'active' || rawState === 'rotating') {
            return {
                state: rawState,
                publicKey: typeof result['public_key'] === 'string' ? result['public_key'] as string : null,
                expiresAt: typeof result['expires_at'] === 'string' ? result['expires_at'] as string : null,
            };
        }
        return { state: rawState, publicKey: null, expiresAt: null };
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
