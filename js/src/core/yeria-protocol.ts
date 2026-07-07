export interface SignedEnvelope {
    /** JSON string of `{appId, timestamp, view}` — the bytes that were signed. */
    payload: string;
    /** Ed25519 signature over `payload` (base64). */
    signature: string;
}

export interface DecodedPayload {
    appId: string;
    timestamp: number;
    view: Record<string, unknown>;
}

export interface YeriaTokenClaims {
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

export type YeriaPublicKeyResolver = (kid: string) => Promise<string | null>;

export interface UserDetails {
    /** The user's opaque public_id (not the internal sequential id). */
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    country_code: string | null;
    email: string | null;
}

/** Yeria's active backend signing key, as returned by
 *  `GET /api/v1/public/registry/public-key`. */
export interface YeriaPublicKey {
    /** PEM-encoded public key. */
    publicKey: string;
    /** `kid` of the active key. */
    keyId: string;
    algorithm: string | null;
    /** ISO expiry, when provided. */
    expiresAt: string | null;
}
