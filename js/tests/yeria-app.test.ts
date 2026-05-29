/**
 * Security tests for YeriaApp class — v3 protocol (signed envelope body).
 */

import { generateKeyPairSync } from 'crypto';
import { YeriaApp } from '../src/core/yeria-app';
import { FormView } from '../src/core/form-view';
import { SignatureVerificationError, ViewExpiredError } from '../src/errors';

describe('YeriaApp - Security Tests', () => {
    let yeriaApp: YeriaApp;

    beforeEach(() => {
        yeriaApp = new YeriaApp({
            appId: 'test-app',
            viewExpirationMinutes: 1
        });
    });

    describe('Signature Collision Prevention', () => {
        it('should prevent collision attacks with different view/timestamp combinations', () => {
            const form1 = yeriaApp.createFormView('form-1', 'Test Form 1');
            form1.addTextField('name', 'Name', true);

            const form2 = yeriaApp.createFormView('form-2', 'Test Form 2');
            form2.addTextField('email', 'Email', true);

            const r1 = yeriaApp.serve(form1);

            const before = Date.now();
            while (Date.now() === before) { /* spin */ }

            const r2 = yeriaApp.serve(form2);

            expect(r1.signature).not.toEqual(r2.signature);
            expect(r1.payload).not.toEqual(r2.payload);
        });

        it('should create different signatures for modified views', () => {
            const form = yeriaApp.createFormView('test-form', 'Original');
            form.addTextField('field1', 'Field 1', true);
            const r1 = yeriaApp.serve(form);

            form.addTextField('field2', 'Field 2', false);
            const r2 = yeriaApp.serve(form);

            expect(r1.signature).not.toEqual(r2.signature);
        });

        it('should verify a fresh envelope', () => {
            const form = yeriaApp.createFormView('test-form', 'Test');
            form.addTextField('name', 'Name', true);
            const envelope = yeriaApp.serve(form);

            expect(() => yeriaApp.verifyIntegrity(envelope)).not.toThrow();
        });

        it('should reject tampered payload', () => {
            const form = yeriaApp.createFormView('test-form', 'Test');
            form.addTextField('name', 'Name', true);
            const envelope = yeriaApp.serve(form);

            const tampered = {
                payload: envelope.payload.replace('"test-form"', '"tampered-id"'),
                signature: envelope.signature,
            };

            expect(() => yeriaApp.verifyIntegrity(tampered)).toThrow();
        });

        it('should reject when signature is replaced', () => {
            const form = yeriaApp.createFormView('test-form', 'Test');
            form.addTextField('name', 'Name', true);
            const envelope = yeriaApp.serve(form);

            const fake = Buffer.from('not-a-real-signature-xx').toString('base64');
            expect(() => yeriaApp.verifyIntegrity({ payload: envelope.payload, signature: fake })).toThrow();
        });

        it('should reject envelope signed by a different app', () => {
            const otherApp = new YeriaApp({ appId: 'wrong-app' });
            const form = otherApp.createFormView('test-form', 'Test');
            form.addTextField('name', 'Name', true);
            const envelope = otherApp.serve(form);

            // Verify on yeriaApp (appId='test-app'). Sig is valid only for
            // otherApp's keypair → fails on the signature check.
            expect(() => yeriaApp.verifyIntegrity(envelope)).toThrow();
        });
    });

    describe('Envelope shape', () => {
        it('should return { payload: string, signature: string }', () => {
            const form = yeriaApp.createFormView('shape-test', 'Test');
            form.addTextField('name', 'Name', true);
            const envelope = yeriaApp.serve(form);

            expect(typeof envelope.payload).toBe('string');
            expect(typeof envelope.signature).toBe('string');

            const decoded = JSON.parse(envelope.payload);
            expect(decoded).toMatchObject({ appId: 'test-app' });
            expect(typeof decoded.timestamp).toBe('number');
            expect(decoded.view).toMatchObject({ id: 'shape-test', type: 'Form' });
        });

        it('should serve views created outside the factory helpers', () => {
            const manualForm = new FormView('manual-form', 'Manual');
            manualForm.addTextField('name', 'Name', true);

            const envelope = yeriaApp.serve(manualForm);
            const decoded = JSON.parse(envelope.payload);

            expect(decoded.view).toMatchObject({ id: 'manual-form', type: 'Form' });
            expect(envelope.signature).toBeDefined();
        });

        it('should expose a static signing helper', () => {
            const form = yeriaApp.createFormView('static-sign', 'Static Sign Test');
            form.addTextField('name', 'Name', true);
            const viewPayload = form.toJSON();
            const timestamp = Date.now();
            const { privateKey, publicKey } = generateKeyPairSync('ed25519');
            const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
            const publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

            const envelope = YeriaApp.signView(viewPayload, 'custom-app', privatePem, timestamp);

            const decoded = JSON.parse(envelope.payload);
            expect(decoded.appId).toBe('custom-app');
            expect(decoded.timestamp).toBe(timestamp);
            expect(decoded.view).toEqual(JSON.parse(JSON.stringify(viewPayload)));
            expect(YeriaApp.verifySignature(publicPem, envelope.payload, envelope.signature)).toBe(true);
        });
    });

    describe('View Expiration Verification', () => {
        it('should reject expired views on verification', async () => {
            const expApp = new YeriaApp({
                appId: 'exp-app',
                viewExpirationMinutes: 0.001
            });

            const form = expApp.createFormView('exp-form', 'Expiring');
            form.addTextField('name', 'Name', true);

            const envelope = expApp.serve(form);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(() => expApp.verifyIntegrity(envelope)).toThrow('expired');
        });
    });

    describe('Static verifySignature method', () => {
        it('should verify signatures with public key only', () => {
            const form = yeriaApp.createFormView('static-test', 'Static Test');
            form.addTextField('name', 'Name', true);

            const envelope = yeriaApp.serve(form);
            const publicKey = yeriaApp.getPublicKey();

            expect(YeriaApp.verifySignature(publicKey, envelope.payload, envelope.signature)).toBe(true);
        });

        it('should reject invalid signatures', () => {
            const form = yeriaApp.createFormView('static-test', 'Static Test');
            form.addTextField('name', 'Name', true);

            const envelope = yeriaApp.serve(form);
            const publicKey = yeriaApp.getPublicKey();

            const fake = Buffer.from('totally-not-a-valid-signature-bytes').toString('base64');
            expect(YeriaApp.verifySignature(publicKey, envelope.payload, fake)).toBe(false);
        });

        it('should reject when payload is tampered', () => {
            const form = yeriaApp.createFormView('test-form2', 'Test');
            form.addTextField('name', 'Name', true);

            const envelope = yeriaApp.serve(form);
            const publicKey = yeriaApp.getPublicKey();

            const tampered = envelope.payload.replace('test-form2', 'pwned');
            expect(YeriaApp.verifySignature(publicKey, tampered, envelope.signature)).toBe(false);
        });
    });

    describe('Static verifyUserToken method', () => {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        const yeriaPrivPem = privateKey as unknown as string;
        const yeriaPubPem = publicKey as unknown as string;

        // Helper: forge a Yeria-style JWT (RS256, kid in header).
        function makeJwt(claims: object, opts: { alg?: string; kid?: string; signerKey?: string } = {}): string {
            const { createSign } = require('crypto');
            const header = { alg: opts.alg ?? 'RS256', typ: 'JWT', kid: opts.kid ?? 'key_test' };
            const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
            const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
            const signingInput = `${headerB64}.${payloadB64}`;
            const signer = createSign('RSA-SHA256');
            signer.update(signingInput);
            signer.end();
            const sig = signer.sign(opts.signerKey ?? yeriaPrivPem).toString('base64url');
            return `${signingInput}.${sig}`;
        }

        const nowSec = () => Math.floor(Date.now() / 1000);

        it('accepts a valid service token', () => {
            const jwt = makeJwt({
                sub: '42',
                aud: '7',
                iss: 'yeria',
                exp: nowSec() + 600,
                iat: nowSec(),
            });
            const claims = YeriaApp.verifyUserToken(jwt, yeriaPubPem, 7);
            expect(claims.sub).toBe('42');
            expect(claims.aud).toBe('7');
            expect(claims.iss).toBe('yeria');
            expect(claims.kid).toBe('key_test');
        });

        it('accepts when expectedServiceId omitted', () => {
            const jwt = makeJwt({
                sub: '42',
                aud: 'yeria-admin',
                iss: 'yeria',
                exp: nowSec() + 600,
            });
            const claims = YeriaApp.verifyUserToken(jwt, yeriaPubPem);
            expect(claims.aud).toBe('yeria-admin');
        });

        it('rejects wrong audience', () => {
            const jwt = makeJwt({
                sub: '42',
                aud: '7',
                iss: 'yeria',
                exp: nowSec() + 600,
            });
            expect(() => YeriaApp.verifyUserToken(jwt, yeriaPubPem, 99)).toThrow();
        });

        it('rejects wrong issuer', () => {
            const jwt = makeJwt({
                sub: '42',
                aud: '7',
                iss: 'not-yeria',
                exp: nowSec() + 600,
            });
            expect(() => YeriaApp.verifyUserToken(jwt, yeriaPubPem, 7)).toThrow();
        });

        it('rejects expired token', () => {
            const jwt = makeJwt({
                sub: '42',
                aud: '7',
                iss: 'yeria',
                exp: nowSec() - 10,
            });
            expect(() => YeriaApp.verifyUserToken(jwt, yeriaPubPem, 7)).toThrow(ViewExpiredError);
        });

        it('rejects tampered payload', () => {
            const jwt = makeJwt({
                sub: '42',
                aud: '7',
                iss: 'yeria',
                exp: nowSec() + 600,
            });
            // Mutate the middle (payload) chunk
            const parts = jwt.split('.');
            const tamperedPayload = Buffer.from(
                JSON.stringify({ sub: 'evil', aud: '7', iss: 'yeria', exp: nowSec() + 600 })
            ).toString('base64url');
            const tamperedJwt = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
            expect(() => YeriaApp.verifyUserToken(tamperedJwt, yeriaPubPem, 7)).toThrow();
        });

        it('rejects signature signed by wrong key', () => {
            const other = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
            const jwt = makeJwt(
                { sub: '42', aud: '7', iss: 'yeria', exp: nowSec() + 600 },
                { signerKey: other.privateKey as unknown as string },
            );
            expect(() => YeriaApp.verifyUserToken(jwt, yeriaPubPem, 7)).toThrow();
        });

        it('rejects non-RS256 alg', () => {
            const jwt = makeJwt(
                { sub: '42', aud: '7', iss: 'yeria', exp: nowSec() + 600 },
                { alg: 'HS256' },
            );
            expect(() => YeriaApp.verifyUserToken(jwt, yeriaPubPem, 7))
                .toThrow(SignatureVerificationError);
        });

        it('rejects malformed jwt (wrong number of parts)', () => {
            expect(() => YeriaApp.verifyUserToken('only.two', yeriaPubPem, 7))
                .toThrow(SignatureVerificationError);
            expect(() => YeriaApp.verifyUserToken('', yeriaPubPem, 7))
                .toThrow(SignatureVerificationError);
        });
    });
});
