import { createVerify } from 'crypto';
import { SignatureVerificationError, ViewExpiredError } from '../../errors';
import { YeriaTokenClaims, YeriaPublicKeyResolver } from '../yeria-protocol';

/**
 * Verifies a Yeria-ISSUED USER JWT (RS256): enforces `iss='yeria'`, an optional
 * `aud=<serviceId>`, and `exp > now`. Static-only helper.
 *
 * `verifyYeriaToken(jwt, pem, aud?)` verifies against a PEM you supply;
 * `verifyYeriaTokenWithResolver(jwt, resolver, aud?)` resolves the key from the
 * token's `kid` header via a resolver (typically YeriaPublicKeys.getByKid).
 * Throws SignatureVerificationError / ViewExpiredError on any failure.
 *
 * Not: this verifies Yeria user JWTs only — it is distinct from YeriaSigner
 * (signs), YeriaEnvelopeVerifier (verifies provider view envelopes) and
 * YeriaPublicKeys (which only resolves keys).
 */
export class YeriaUserTokenVerifier {
    /** Verify a Yeria user JWT against a PEM you supply; returns the claims. */
    static verifyYeriaToken(
        jwtToken: string,
        yeriaPublicKey: string,
        expectedAudience?: string | number,
    ): YeriaTokenClaims {
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
        let claims: YeriaTokenClaims;
        try {
            header = JSON.parse(base64UrlDecodeToString(headerB64));
            claims = JSON.parse(base64UrlDecodeToString(payloadB64)) as YeriaTokenClaims;
        } catch (_e) {
            throw new SignatureVerificationError('yeria', 'invalid base64 / json');
        }

        if (header['alg'] !== 'RS256') {
            throw new SignatureVerificationError(
                'yeria',
                `unsupported alg: ${String(header['alg'])}`,
            );
        }

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
        if (expectedAudience !== undefined && claims.aud !== String(expectedAudience)) {
            throw new SignatureVerificationError(
                'yeria',
                `audience mismatch: token aud=${claims.aud}, expected=${String(expectedAudience)}`,
            );
        }

        const nowSec = Math.floor(Date.now() / 1000);
        if (typeof claims.exp !== 'number' || claims.exp <= nowSec) {
            throw new ViewExpiredError('user-token', (nowSec - (claims.exp || 0)) * 1000, 0);
        }

        if (typeof header['kid'] === 'string') {
            claims.kid = header['kid'] as string;
        }
        return claims;
    }

    /** Verify a Yeria user JWT, resolving the key from its `kid` header via `resolver`. */
    static async verifyYeriaTokenWithResolver(
        jwtToken: string,
        resolver: YeriaPublicKeyResolver,
        expectedAudience?: string | number,
    ): Promise<YeriaTokenClaims> {
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
            throw new SignatureVerificationError(
                'yeria',
                `no trusted key for kid=${kid}`,
            );
        }

        return YeriaUserTokenVerifier.verifyYeriaToken(jwtToken, pem, expectedAudience);
    }
}

function base64UrlDecodeToBuffer(input: string): Buffer {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') +
        '==='.slice((input.length + 3) % 4);
    return Buffer.from(padded, 'base64');
}

function base64UrlDecodeToString(input: string): string {
    return base64UrlDecodeToBuffer(input).toString('utf8');
}
