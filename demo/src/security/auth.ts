// Express middleware that gates every demo route on a valid Yeria-issued
// user token. The demo is a *provider* in Yeria's architecture (mobile talks
// straight to it, Yeria itself is registry + auth only), so the provider is
// responsible for proving the caller is who Yeria says they are before
// serving any signed view.
//
// Verification flow (all handled inside `app.verifyUserToken`):
//   1. Extract Bearer token from `Authorization`.
//   2. The SDK reads `kid` from the JWT header and resolves it → Ed25519 PEM
//      against `GET /api/v1/public/registry/public-keys/{kid}` on yeria-admin
//      (rotation-aware, cached internally — you never wire a resolver).
//   3. It verifies signature, `iss='yeria'`, optional `aud`, and `exp`.
//
// Anything that fails → 401 + a JSON body the SDK renderer can surface. A
// YeriaPlatformUnreachableError (Yeria itself down) is surfaced as 503, not
// 401 — "cannot verify" is not "invalid". Claims land on
// `res.locals.userClaims` for downstream route handlers.

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { YeriaApp, YeriaPlatformUnreachableError, type YeriaTokenClaims } from '@numerum-tech/yeriasdk';

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
}

export function buildYeriaAuthMiddleware(opts: YeriaAuthOptions): RequestHandler {
    if (!opts || !opts.yeriaBaseUrl) {
        throw new Error('buildYeriaAuthMiddleware: yeriaBaseUrl is required');
    }
    // A verify-only YeriaApp: it needs `baseUrl` to resolve `kid` headers. The
    // internal key cache (and its rotation-aware lookup) lives on this single
    // instance — construct it once and reuse it for every request.
    const app = new YeriaApp({ appId: 'yeria-demo-auth', baseUrl: opts.yeriaBaseUrl });

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
            const claims: YeriaTokenClaims = await app.verifyUserToken(
                token,
                opts.expectedServiceId,
            );
            res.locals.userClaims = claims;
            next();
        } catch (err: any) {
            if (err instanceof YeriaPlatformUnreachableError) {
                // Yeria itself is unreachable — we could not make a decision.
                // 503, not 401: this is "cannot verify now", not "invalid".
                res.status(503).json({
                    error: 'yeria_unreachable',
                    message: 'Could not reach Yeria to verify the token — retry shortly.',
                });
                return;
            }
            // SignatureVerificationError | ViewExpiredError | unknown key.
            // Keep the body shape stable so the renderer can localize.
            res.status(401).json({
                error: 'unauthorized',
                message: err && err.message ? String(err.message) : 'Invalid token',
            });
        }
    };
}
