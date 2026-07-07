import { verify } from 'crypto';
import { AppIdMismatchError, SignatureVerificationError, ViewExpiredError } from '../../errors';
import { DecodedPayload, SignedEnvelope } from '../yeria-protocol';

export interface YeriaEnvelopeVerifierConfig {
    appId: string;
    publicKey: string;
    viewExpirationMinutes: number;
}

/**
 * Verifies a signed VIEW envelope produced by a provider, against the service
 * public key. Owned by YeriaUI.
 *
 * `verifyIntegrity` checks (1) the Ed25519 signature over the payload bytes,
 * (2) that the envelope's appId matches, and (3) that the view has not expired;
 * it throws SignatureVerificationError / AppIdMismatchError / ViewExpiredError
 * and is fail-closed (any unexpected error becomes a SignatureVerificationError).
 * The static `verifySignature` is the low-level stateless boolean check.
 *
 * Not: this verifies provider view envelopes only — it is distinct from
 * YeriaSigner (signs) and YeriaUserTokenVerifier (verifies Yeria-issued user
 * JWTs).
 */
export class YeriaEnvelopeVerifier {
    private config: YeriaEnvelopeVerifierConfig;

    constructor(config: YeriaEnvelopeVerifierConfig) {
        this.config = config;
    }

    /** Swap the service public key (e.g. after a key rotation). */
    setPublicKey(publicKey: string): void {
        this.config.publicKey = publicKey;
    }

    /** Verify signature, appId match and view freshness; throws on any failure. */
    verifyIntegrity(envelope: SignedEnvelope): boolean {
        try {
            const signatureBuffer = Buffer.from(envelope.signature, 'base64');
            const isValid = verify(
                null,
                Buffer.from(envelope.payload, 'utf8'),
                this.config.publicKey,
                signatureBuffer,
            );
            if (!isValid) {
                throw new SignatureVerificationError(this.config.appId);
            }

            const decoded = JSON.parse(envelope.payload) as DecodedPayload;

            if (decoded.appId !== this.config.appId) {
                throw new AppIdMismatchError(this.config.appId, decoded.appId);
            }

            const now = Date.now();
            const expirationTime = this.config.viewExpirationMinutes * 60 * 1000;
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

    /** Low-level stateless check: is `signature` a valid Ed25519 signature over `payload`? */
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
                console.error('[YeriaEnvelopeVerifier] Error verifying signature:', err);
            }
            return false;
        }
    }
}
