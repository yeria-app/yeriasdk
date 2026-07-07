// Demonstrates the provider → Yeria user-details flow end to end.
//
// The user's Yeria service token (aud = this service) arrives on every
// request. The demo:
//   1. verifies the token with `app.verifyUserToken(token, serviceId)` — the
//      SDK resolves the signing `kid` against Yeria and checks
//      signature / iss / aud / exp for you (no manual key fetch);
//   2. passes the SAME token to `app.fetchUserDetails()` — Yeria re-verifies
//      it (provider Ed25519 signature + user token) and returns the user's
//      details, keyed by the token's opaque public_id;
//   3. renders the details back to the caller as a signed ReaderView.

import { Router, Request, Response } from 'express';
import { YeriaApp, YeriaUI } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

function extractBearer(req: Request): string {
    const raw = req.headers['authorization'];
    const m = typeof raw === 'string' ? raw.match(/^Bearer\s+(.+)$/i) : null;
    return m && m[1] ? m[1].trim() : '';
}

export function buildUserDetailsRouter(yeriaBaseUrl: string, serviceId: string | number): Router {
    const router = Router();

    const yeriaApp = new YeriaApp({
        appId: 'demo-app-user-details',
        viewExpirationMinutes: 30,
        baseUrl: yeriaBaseUrl,
        privateKey: DEMO_KEYS.privateKey,
        publicKey: DEMO_KEYS.publicKey,
    });

    router.get('/', async (req: Request, res: Response) => {
        const token = extractBearer(req);
        if (!token) {
            res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' });
            return;
        }
        try {
            // 1. Verify the inbound token (kid resolved against Yeria for us).
            const claims = await yeriaApp.verifyUserToken(token, serviceId);

            // 2. Fetch the user's details from Yeria with the same token.
            const details = await yeriaApp.fetchUserDetails({ userServiceToken: token });

            // 3. Render the result back to the caller.
            const reader = YeriaUI
                .createReaderView('user-details', 'Vos informations Yeria')
                .setIntro(`Token vérifié (sub=${claims.sub}, aud=${claims.aud}) puis détails récupérés en direct depuis Yeria.`)
                .addSubTitle('Détails')
                .addListField([
                    `ID : ${details.user_id}`,
                    `Prénom : ${details.first_name ?? '—'}`,
                    `Nom : ${details.last_name ?? '—'}`,
                    `Pays : ${details.country_code ?? '—'}`,
                    `Email : ${details.email ?? '—'}`,
                ]);

            res.json(yeriaApp.serve(reader));
        } catch (err: any) {
            res.status(502).json({
                error: 'user_details_failed',
                message: err && err.message ? String(err.message) : String(err),
            });
        }
    });

    return router;
}
