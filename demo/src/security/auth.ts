// Express middleware that gates every demo route on a valid Yeria-issued
// user token. The demo is a *provider* in Yeria's architecture (mobile talks
// straight to it, Yeria itself is registry + auth only), so the provider is
// responsible for proving the caller is who Yeria says they are before
// serving any signed view.
//
// Verification flow (handled inside the SDK):
//   1. Extract Bearer token from `Authorization`.
//   2. Read `kid` from the JWT header.
//   3. Resolve `kid` → Ed25519 PEM via YeriaKeyStore (cached lookup against
//      `GET /api/v1/public/registry/public-keys/{kid}` on yeria-admin).
//   4. Verify signature, `aud='yeria'`, `iss='yeria'`, and `exp`.
//
// Anything that fails → 401 + a JSON body the SDK renderer can surface.
// Claims land on `res.locals.userClaims` for downstream route handlers
// (avoids mutating the Request type and works without an Express ambient).

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { YeriaApp, YeriaKeyStore, type UserTokenClaims } from '@numerum-tech/yeriasdk';

const BEARER_RE = /^Bearer\s+(.+)$/i;

function extractBearer(req: Request): string | null {
    const raw = req.headers['authorization'] || req.headers['Authorization' as any];
    if (typeof raw !== 'string') return null;
    const m = raw.match(BEARER_RE);
    return m && m[1] ? m[1].trim() : null;
}

export interface YeriaAuthOptions {
    /**
     * Base URL of the Yeria platform. Required — the SDK has no way to
     * resolve `kid` headers without it. Trailing slash optional.
     */
    yeriaBaseUrl: string;
    /**
     * Service identifier (numeric or string) to enforce as `aud`. Optional
     * — the demo is not bound to a fixed service id at build time. When
     * omitted, the middleware still validates `aud='yeria'`/`iss='yeria'`
     * via the underlying verifyUserToken path.
     */
    expectedServiceId?: string | number;
    /**
     * Per-kid cache TTL forwarded to YeriaKeyStore. Default 10 min.
     */
    keyTtlMs?: number;
}

export function buildYeriaAuthMiddleware(opts: YeriaAuthOptions): RequestHandler {
    if (!opts || !opts.yeriaBaseUrl) {
        throw new Error('buildYeriaAuthMiddleware: yeriaBaseUrl is required');
    }
    const keys = new YeriaKeyStore({
        baseUrl: opts.yeriaBaseUrl,
        ttlMs: opts.keyTtlMs,
    });

    return async function yeriaAuth(req: Request, res: Response, next: NextFunction) {
        const token = extractBearer(req);
        if (!token) {
            res.status(401).json({
                error: 'unauthorized',
                message: 'Missing Bearer token',
            });
            return;
        }
        try {
            const claims: UserTokenClaims = await YeriaApp.verifyUserTokenWithResolver(
                token,
                (kid) => keys.getByKid(kid),
                opts.expectedServiceId,
            );
            res.locals.userClaims = claims;
            next();
        } catch (err: any) {
            // SignatureVerificationError | ViewExpiredError | resolver miss.
            // Keep the body shape stable so the renderer can localize.
            res.status(401).json({
                error: 'unauthorized',
                message: err && err.message ? String(err.message) : 'Invalid token',
            });
        }
    };
}
