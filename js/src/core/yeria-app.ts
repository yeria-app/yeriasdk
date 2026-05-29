import { generateKeyPairSync, randomBytes, sign, verify, createVerify } from 'crypto';
import { BaseView } from './base-view';
import { FormView } from './form-view';
import { ReaderView } from './reader-view';
import { ActionListView } from './action-list-view';
import { ActionGridView } from './action-grid-view';
import { QRScanView } from './qr-scan-view';
import { QRDisplayView } from './qr-display-view';
import { MessageView } from './message-view';
import { CardView } from './card-view';
import { CarouselView } from './carousel-view';
import { TimelineView } from './timeline-view';
import { MediaView } from './media-view';
import { MapView } from './map-view';
import {
    AppIdMismatchError,
    ViewExpiredError,
    SignatureVerificationError,
    ConfigurationError,
    ExternalError,
    ERROR_CODES
} from '../errors';
import { Notification } from './notification';
import { SecureNotificationResponse } from '../types';

// Types pour la configuration sécurisée
export interface YeriaAppConfig {
    appId: string;
    privateKey?: string; // Clé privée Ed25519 (optionnelle, générée automatiquement si non fournie)
    publicKey?: string;  // Clé publique Ed25519 (optionnelle, générée automatiquement si non fournie)
    allowedDomains?: string[];
    viewExpirationMinutes?: number;
    platformUrl?: string; // City-Mate platform endpoint URL for notifications
    notificationTimeout?: number; // HTTP request timeout in ms (default: 5000)
}

/**
 * What `serve()` returns. The whole object goes on the wire as a JSON
 * envelope — `res.json(yeriaApp.serve(view))`. The signature CANNOT be
 * forgotten because it lives in the structure itself, not in a header.
 *
 * `payload` is a JSON string (already serialised) — it's the bytes that
 * were signed. The renderer verifies the signature on those exact bytes,
 * then JSON.parses `payload` to get the decoded view envelope. No
 * re-stringification happens on either side, so JS and Dart can't drift
 * on JSON encoding.
 */
export interface SignedEnvelope {
    /** JSON string of `{appId, timestamp, view}` — the bytes that were signed. */
    payload: string;
    /** Ed25519 signature over `payload` (base64). */
    signature: string;
}

/** Decoded inner payload — the parsed shape of `payload`. */
export interface DecodedPayload {
    appId: string;
    timestamp: number;
    view: Record<string, unknown>;
}

/**
 * Claims surfaced by `verifyUserToken` after a successful RS256 check.
 * Mirrors the fields Yeria puts in a per-service JWT.
 */
export interface UserTokenClaims {
    /** Yeria user id. */
    sub: string;
    /** Either `'yeria-admin'` for the platform token, or the service id (as string) for a service-scoped token. */
    aud: string;
    /** Issuer — always `'yeria'`. */
    iss: string;
    /** Expiration time (unix seconds). */
    exp: number;
    /** Issued-at time (unix seconds). */
    iat?: number;
    /** Key id from the JWT header (`kid`). Useful for key-rollover scenarios. */
    kid?: string;
}

/**
 * Resolver passed to `verifyUserTokenWithResolver`. Given the `kid` from
 * the JWT header, returns the PEM the SDK should verify against — or
 * `null` when the key is expired / unknown / not yet propagated. Wraps
 * whatever lookup strategy the caller wants (typically `YeriaKeyStore`).
 */
export type YeriaPublicKeyResolver = (kid: string) => Promise<string | null>;

/**
 * Projection returned by `YeriaApp.fetchUserProfile`. The current Yeria
 * scope is intentionally minimal; the per-service `service_access.profile_scopes`
 * work will widen this set without changing the field names.
 */
export interface UserProfile {
    user_id: number;
    first_name: string | null;
    last_name: string | null;
    country_code: string | null;
}

export class YeriaApp {
    private config: YeriaAppConfig;
    private privateKey: string;
    private publicKey: string;

    constructor(config: YeriaAppConfig) {
        this.config = {
            allowedDomains: [],
            viewExpirationMinutes: 60,
            ...config
        };

        // Génération ou utilisation des clés Ed25519
        if (config.privateKey && config.publicKey) {
            this.privateKey = config.privateKey;
            this.publicKey = config.publicKey;
        } else {
            // Génération automatique des clés Ed25519
            const keyPair = generateKeyPairSync('ed25519');
            this.privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
            this.publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
        }
    }

    /**
     * Crée une vue de formulaire sécurisée
     */
    createFormView(formId: string, title: string, processId?: string): FormView {
        return new FormView(formId, title, processId);
    }

    /**
     * Crée une vue de lecture sécurisée
     */
    createReaderView(viewId: string, title: string, processId?: string): ReaderView {
        return new ReaderView(viewId, title, processId);
    }

    /**
     * Crée une vue de liste d'actions sécurisée
     */
    createActionListView(viewId: string, title: string, processId?: string): ActionListView {
        return new ActionListView(viewId, title, processId);
    }

    /**
     * Crée une vue de grille d'actions sécurisée
     */
    createActionGridView(viewId: string, title: string, processId?: string): ActionGridView {
        return new ActionGridView(viewId, title, processId);
    }

    /**
     * Crée une vue de scan QR sécurisée
     */
    createQRScanView(viewId: string, title: string, processId?: string): QRScanView {
        return new QRScanView(viewId, title, processId);
    }

    /**
     * Crée une vue d'affichage QR sécurisée
     */
    createQRDisplayView(viewId: string, title: string, processId?: string): QRDisplayView {
        return new QRDisplayView(viewId, title, processId);
    }

    /**
     * Crée une vue de message sécurisée
     */
    createMessageView(viewId: string, title: string, processId?: string): MessageView {
        return new MessageView(viewId, title, processId);
    }

    createCardView(viewId: string, title: string, processId?: string): CardView {
        return new CardView(viewId, title, processId);
    }

    createCarouselView(viewId: string, title: string, processId?: string): CarouselView {
        return new CarouselView(viewId, title, processId);
    }

    createTimelineView(viewId: string, title: string, processId?: string): TimelineView {
        return new TimelineView(viewId, title, processId);
    }

    createMediaView(viewId: string, title: string, processId?: string): MediaView {
        return new MediaView(viewId, title, processId);
    }

    createMapView(viewId: string, title: string, processId?: string): MapView {
        return new MapView(viewId, title, processId);
    }

    /**
     * Crée une notification pour un utilisateur spécifique
     */
    createNotification(userId: string, title: string, body: string, link?: string): Notification {
        return new Notification(userId, title, body, link);
    }

    /**
     * Signe une notification avec Ed25519
     */
    signNotification(notification: Notification): SecureNotificationResponse {
        const notificationJson = notification.toJSON();
        const timestamp = Date.now();
        // Payload must match backend reconstruction: { notification (object), timestamp, appId }
        const payload = JSON.stringify({
            notification: notificationJson,
            timestamp: timestamp,
            appId: this.config.appId
        });
        const signatureBuffer = sign(null, Buffer.from(payload), this.privateKey);
        const signature = signatureBuffer.toString('base64');

        return {
            appId: this.config.appId,
            signature,
            timestamp,
            notification: notificationJson
        };
    }

    /**
     * Envoie une notification signée à la plateforme City-Mate
     * @param notification - Notification à envoyer
     * @param platformUrl - URL de la plateforme (optionnel, utilise config.platformUrl si non fourni)
     * @throws {ConfigurationError} Si aucune URL de plateforme n'est configurée
     * @throws {ExternalError} Si l'envoi échoue
     */
    async sendNotification(
        notification: Notification,
        platformUrl?: string
    ): Promise<void> {
        const signedNotification = this.signNotification(notification);
        const url = platformUrl || this.config.platformUrl;

        if (!url) {
            throw new ConfigurationError('Platform URL required for sending notifications. Set platformUrl in YeriaAppConfig or pass it as parameter.');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signedNotification),
                signal: AbortSignal.timeout(this.config.notificationTimeout || 5000)
            });

            if (!response.ok) {
                throw new ExternalError(
                    ERROR_CODES.NOTIFICATION_FAILED,
                    `Failed to send notification: ${response.status} ${response.statusText}`,
                    'fetch'
                );
            }
        } catch (error) {
            if (error instanceof ExternalError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new ExternalError(
                ERROR_CODES.NOTIFICATION_FAILED,
                `Failed to send notification: ${error instanceof Error ? error.message : String(error)}`,
                'fetch',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Rotate the service's signing key on the Yeria registry. The rotation
     * envelope is signed with the *current* private key — the caller proves
     * they own the still-valid keypair before the new one is accepted.
     *
     * After this call succeeds:
     *   - The new public key becomes Active on Yeria.
     *   - The old key keeps validating signatures for ~5 minutes (grace
     *     window so in-flight signed responses still verify).
     *   - This YeriaApp instance is mutated to use the new keypair locally.
     *
     * @param yeriaApiBaseUrl - Yeria registry root, e.g. `https://yeria.app`
     * @param serviceId       - The service id assigned by Yeria
     * @param newKeys         - The freshly-generated keypair to switch to
     */
    async rotateKey(
        yeriaApiBaseUrl: string,
        serviceId: string | number,
        newKeys: { privateKey: string; publicKey: string }
    ): Promise<{ keyId: number; expiresAt: string; gracePeriodMinutes: number }> {
        if (!newKeys?.privateKey || !newKeys?.publicKey) {
            throw new ConfigurationError('rotateKey requires { privateKey, publicKey } in PEM');
        }

        const envelope = {
            serviceId: String(serviceId),
            newPublicKey: newKeys.publicKey,
            timestamp: Date.now()
        };
        const payload = JSON.stringify(envelope);
        const signature = sign(null, Buffer.from(payload), this.privateKey).toString('base64');

        const url = `${yeriaApiBaseUrl.replace(/\/+$/, '')}/api/v1/services/${serviceId}/keys/rotate`;
        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    envelope,
                    signature,
                    currentPublicKey: this.publicKey
                }),
                signal: AbortSignal.timeout(this.config.notificationTimeout || 5000)
            });
        } catch (error) {
            throw new ExternalError(
                ERROR_CODES.NOTIFICATION_FAILED,
                `Key rotation request failed: ${error instanceof Error ? error.message : String(error)}`,
                'fetch',
                error instanceof Error ? error : undefined
            );
        }

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new ExternalError(
                ERROR_CODES.NOTIFICATION_FAILED,
                `Key rotation rejected: ${response.status} ${response.statusText} ${text}`,
                'fetch'
            );
        }

        const body = await response.json() as {
            data?: {
                key?: { id: number; expires_at: string };
                grace_period_minutes?: number;
            };
        };

        // Locally swap to the new keypair so subsequent serve() calls sign
        // with it. Old responses still verify against the old public key
        // during the grace window because Yeria keeps both rows Active.
        this.privateKey = newKeys.privateKey;
        this.publicKey = newKeys.publicKey;

        return {
            keyId: body.data?.key?.id as number,
            expiresAt: body.data?.key?.expires_at as string,
            gracePeriodMinutes: body.data?.grace_period_minutes ?? 5
        };
    }

    /**
     * Sérialise une vue, signe les bytes sérialisés, et retourne une
     * enveloppe `{payload, signature}` à envoyer telle quelle au client.
     *
     * Usage côté provider (Express) :
     *   res.json(yeriaApp.serve(view));
     *   res.status(400).json(yeriaApp.serve(errorMessage));
     *
     * La signature est dans la structure de retour — impossible de
     * l'oublier en l'envoyant. Le client vérifie sur `payload` (string)
     * sans re-stringification.
     */
    serve(view: BaseView): SignedEnvelope {
        const decoded: DecodedPayload = {
            appId: this.config.appId,
            timestamp: Date.now(),
            view: view.toJSON()
        };
        const payload = JSON.stringify(decoded);
        const signature = sign(null, Buffer.from(payload, 'utf8'), this.privateKey).toString('base64');
        return { payload, signature };
    }

    /**
     * Obtient la clé publique pour la vérification côté frontend
     */
    getPublicKey(): string {
        return this.publicKey;
    }

    /**
     * Vérifie l'intégrité d'une enveloppe signée reçue du wire.
     *
     * @throws {AppIdMismatchError}        si appId ne matche pas this.config.appId
     * @throws {ViewExpiredError}          si timestamp > viewExpirationMinutes
     * @throws {SignatureVerificationError} si signature invalide ou payload malformé
     */
    verifyIntegrity(envelope: SignedEnvelope): boolean {
        try {
            // 1. Verify signature on payload bytes — no re-stringification
            const signatureBuffer = Buffer.from(envelope.signature, 'base64');
            const isValid = verify(
                null,
                Buffer.from(envelope.payload, 'utf8'),
                this.publicKey,
                signatureBuffer,
            );
            if (!isValid) {
                throw new SignatureVerificationError(this.config.appId);
            }

            // 2. Parse the now-trusted payload
            const decoded = JSON.parse(envelope.payload) as DecodedPayload;

            // 3. appId match
            if (decoded.appId !== this.config.appId) {
                throw new AppIdMismatchError(this.config.appId, decoded.appId);
            }

            // 4. Expiration window
            const now = Date.now();
            const expirationTime = this.config.viewExpirationMinutes! * 60 * 1000;
            const age = now - decoded.timestamp;
            if (age > expirationTime) {
                const viewId = typeof decoded.view['id'] === 'string'
                    ? decoded.view['id'] as string
                    : 'unknown';
                throw new ViewExpiredError(viewId, age, expirationTime);
            }

            return true;
        } catch (error) {
            if (error instanceof AppIdMismatchError ||
                error instanceof ViewExpiredError ||
                error instanceof SignatureVerificationError) {
                throw error;
            }
            throw new SignatureVerificationError(this.config.appId);
        }
    }

    /**
     * Méthode statique pour vérifier une signature.
     * @param publicKey - Clé publique Ed25519 (PEM format)
     * @param payload   - JSON string signée (extraite de l'enveloppe)
     * @param signature - Signature base64
     * @param onError   - Optional error callback for logging
     * @returns true si la signature est valide
     */
    static verifySignature(
        publicKey: string,
        payload: string,
        signature: string,
        onError?: (error: Error) => void
    ): boolean {
        try {
            const signatureBuffer = Buffer.from(signature, 'base64');
            return verify(null, Buffer.from(payload, 'utf8'), publicKey, signatureBuffer);
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            if (onError) {
                onError(err);
            } else if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
                console.error('[YeriaApp] Error verifying signature:', err);
            }
            return false;
        }
    }

    /**
     * Génère statiquement une enveloppe signée sans instance YeriaApp.
     */
    static signView(
        view: Record<string, unknown>,
        appId: string,
        privateKey: string,
        timestamp: number = Date.now()
    ): SignedEnvelope {
        const decoded: DecodedPayload = { appId, timestamp, view };
        const payload = JSON.stringify(decoded);
        const signature = sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');
        return { payload, signature };
    }

    /**
     * Verify a Yeria-issued user token (RS256 JWT signed by Yeria's
     * Registry RSA key). Used by providers to authenticate inbound
     * requests carrying `Authorization: Bearer <serviceToken>`.
     *
     * @param jwtToken           Compact JWT (header.payload.signature, base64url).
     * @param yeriaPublicKey     Yeria's Registry public key in PEM format.
     *                           Fetch once at boot from
     *                           `GET /api/v1/registry/public-key` and cache.
     * @param expectedServiceId  When supplied, asserts `aud === String(expectedServiceId)`.
     *                           Pass the service id your backend is hosting; refuse
     *                           tokens scoped to a different service.
     * @returns                  The verified claims object.
     * @throws SignatureVerificationError if signature invalid / token malformed / wrong issuer / wrong audience.
     * @throws ViewExpiredError            if the `exp` claim is in the past.
     */
    static verifyUserToken(
        jwtToken: string,
        yeriaPublicKey: string,
        expectedServiceId?: string | number,
    ): UserTokenClaims {
        if (typeof jwtToken !== 'string' || jwtToken.length === 0) {
            throw new SignatureVerificationError('yeria', 'missing jwt');
        }
        const parts = jwtToken.split('.');
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            throw new SignatureVerificationError('yeria', 'malformed jwt');
        }
        const headerB64 = parts[0];
        const payloadB64 = parts[1];
        const signatureB64 = parts[2];

        let header: Record<string, unknown>;
        let claims: UserTokenClaims;
        try {
            header = JSON.parse(base64UrlDecodeToString(headerB64));
            claims = JSON.parse(base64UrlDecodeToString(payloadB64)) as UserTokenClaims;
        } catch (_e) {
            throw new SignatureVerificationError('yeria', 'invalid base64 / json');
        }

        if (header['alg'] !== 'RS256') {
            throw new SignatureVerificationError(
                'yeria',
                `unsupported alg: ${String(header['alg'])}`,
            );
        }

        // Verify RSA-SHA256 over the canonical signing input.
        const signingInput = `${headerB64}.${payloadB64}`;
        const signatureBytes = base64UrlDecodeToBuffer(signatureB64);
        const verifier = createVerify('RSA-SHA256');
        verifier.update(signingInput);
        verifier.end();
        const sigOk = verifier.verify(yeriaPublicKey, signatureBytes);
        if (!sigOk) {
            throw new SignatureVerificationError('yeria', 'signature mismatch');
        }

        if (claims.iss !== 'yeria') {
            throw new SignatureVerificationError(
                'yeria',
                `unexpected issuer: ${String(claims.iss)}`,
            );
        }
        if (expectedServiceId !== undefined && claims.aud !== String(expectedServiceId)) {
            throw new SignatureVerificationError(
                'yeria',
                `audience mismatch: token aud=${claims.aud}, expected=${String(expectedServiceId)}`,
            );
        }

        const nowSec = Math.floor(Date.now() / 1000);
        if (typeof claims.exp !== 'number' || claims.exp <= nowSec) {
            throw new ViewExpiredError('user-token', (nowSec - (claims.exp || 0)) * 1000, 0);
        }

        // Surface kid from the header for caller convenience.
        if (typeof header['kid'] === 'string') {
            claims.kid = header['kid'] as string;
        }
        return claims;
    }

    /**
     * Same audience-scoped JWT verify as `verifyUserToken`, but the second
     * argument is a kid resolver instead of a fixed PEM. The SDK pulls
     * the `kid` from the JWT header, calls `resolver(kid)`, and verifies
     * the signature against whatever PEM comes back.
     *
     * Pair with `YeriaKeyStore` so providers don't have to write key-
     * fetching, caching or rotation-grace handling themselves.
     *
     * @throws SignatureVerificationError if the resolver returns null, the
     *         signature fails, the issuer / audience mismatches, or the
     *         JWT is malformed.
     * @throws ViewExpiredError when `exp` is in the past.
     */
    static async verifyUserTokenWithResolver(
        jwtToken: string,
        resolver: YeriaPublicKeyResolver,
        expectedServiceId?: string | number,
    ): Promise<UserTokenClaims> {
        if (typeof jwtToken !== 'string' || jwtToken.length === 0) {
            throw new SignatureVerificationError('yeria', 'missing jwt');
        }
        const parts = jwtToken.split('.');
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            throw new SignatureVerificationError('yeria', 'malformed jwt');
        }

        let header: Record<string, unknown>;
        try {
            header = JSON.parse(base64UrlDecodeToString(parts[0]));
        } catch (_e) {
            throw new SignatureVerificationError('yeria', 'invalid header');
        }

        const kid = header['kid'];
        if (typeof kid !== 'string' || kid.length === 0) {
            throw new SignatureVerificationError('yeria', 'jwt header missing kid');
        }

        const pem = await resolver(kid);
        if (!pem) {
            // Resolver returns null when Yeria says the key is expired or
            // the kid is unknown. Either way the token cannot be trusted.
            throw new SignatureVerificationError(
                'yeria',
                `no trusted key for kid=${kid}`,
            );
        }

        return YeriaApp.verifyUserToken(jwtToken, pem, expectedServiceId);
    }

    /**
     * Provider-side helper: fetch a Yeria user's profile by `sub`.
     *
     * Builds an Ed25519-signed envelope and POSTs to
     * `POST /api/v1/provider/services/{serviceId}/users/{userId}/profile`.
     * Yeria already holds every Active public key for this service, so
     * the envelope itself is the only credential — no user JWT is sent
     * in the body and the PEM is never disclosed.
     *
     * Typical usage (provider middleware after `verifyUserTokenWithResolver`):
     *
     *   let user = await db.users.findByYeriaSub(claims.sub);
     *   if (!user) {
     *     const profile = await YeriaApp.fetchUserProfile({
     *       baseUrl: process.env.YERIA_BASE_URL,
     *       serviceId: MY_SERVICE_ID,
     *       userId: claims.sub,
     *       privateKey: SERVICE_ED25519_PRIVATE_KEY,
     *     });
     *     user = await db.users.insert({ yeria_sub: claims.sub, ...profile });
     *   }
     *
     * The hot path stays local-DB after the first miss.
     */
    static async fetchUserProfile(opts: {
        baseUrl: string;
        serviceId: string | number;
        userId: string | number;
        privateKey: string;
        fetch?: typeof fetch;
    }): Promise<UserProfile> {
        if (!opts || !opts.baseUrl)    throw new Error('fetchUserProfile: baseUrl is required');
        if (opts.serviceId === undefined || opts.serviceId === null) {
            throw new Error('fetchUserProfile: serviceId is required');
        }
        if (opts.userId === undefined || opts.userId === null) {
            throw new Error('fetchUserProfile: userId is required');
        }
        if (typeof opts.privateKey !== 'string' || opts.privateKey.length === 0) {
            throw new Error('fetchUserProfile: privateKey (PEM) is required');
        }

        const fetchImpl = opts.fetch ?? globalThis.fetch;
        if (typeof fetchImpl !== 'function') {
            throw new Error(
                'fetchUserProfile: no fetch available — pass opts.fetch on Node < 18 or non-browser runtimes',
            );
        }

        const envelope = {
            service_id: opts.serviceId,
            user_id: opts.userId,
            timestamp: Date.now(),
            nonce: randomBytes(16).toString('hex'),
        };
        const payloadStr = JSON.stringify(envelope);
        const signature = sign(null, Buffer.from(payloadStr, 'utf8'), opts.privateKey).toString('base64');

        const baseUrl = opts.baseUrl.replace(/\/+$/, '');
        const url = `${baseUrl}/api/v1/provider/services/${encodeURIComponent(String(opts.serviceId))}/users/${encodeURIComponent(String(opts.userId))}/profile`;

        const res = await fetchImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ envelope, signature }),
        });

        let body: unknown;
        try { body = await res.json(); }
        catch (_e) { body = null; }

        if (!res.ok) {
            const msg = extractErrorMessage(body) || `HTTP ${res.status}`;
            throw new Error(`Yeria profile fetch failed: ${msg}`);
        }

        const result = (body && typeof body === 'object' && 'result' in body)
            ? (body as { result: unknown }).result
            : body;
        if (!result || typeof result !== 'object') {
            throw new Error('Yeria profile fetch: unexpected response shape');
        }
        const r = result as Record<string, unknown>;
        return {
            user_id: Number(r['user_id']),
            first_name: typeof r['first_name'] === 'string' ? r['first_name'] as string : null,
            last_name:  typeof r['last_name']  === 'string' ? r['last_name']  as string : null,
            country_code: typeof r['country_code'] === 'string' ? r['country_code'] as string : null,
        };
    }
}

function extractErrorMessage(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    if (typeof b['message'] === 'string') return b['message'] as string;
    if (b['error'] && typeof b['error'] === 'object') {
        const e = b['error'] as Record<string, unknown>;
        if (typeof e['message'] === 'string') return e['message'] as string;
    }
    if (typeof b['error'] === 'string') return b['error'] as string;
    return null;
}

// ── base64url helpers (stateless, no dep) ────────────────────────────────
// JWT uses base64url (RFC 4648 §5): `-` for `+`, `_` for `/`, no padding.

function base64UrlDecodeToBuffer(input: string): Buffer {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') +
        '==='.slice((input.length + 3) % 4);
    return Buffer.from(padded, 'base64');
}

function base64UrlDecodeToString(input: string): string {
    return base64UrlDecodeToBuffer(input).toString('utf8');
}
