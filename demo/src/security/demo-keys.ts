// Hardcoded Ed25519 keypair for the YeriaApp demo. Committed deliberately —
// the demo is a public showcase, not a sensitive workload.
//
// The matching public key is registered in Yeria's `apikeys` table by
// `yeria-admin/source/bootstrap-yeria-demo.js` so the renderer can verify
// every signed response served by the demo.
//
// Operators may override this keypair by setting DEMO_PRIVATE_KEY +
// DEMO_PUBLIC_KEY env vars on the yeria-demo container. The matching
// DEMO_PUBLIC_KEY must also be set on the yeria-admin container so the
// renderer-side verification keys stay in sync.
//
// To regenerate (do NOT do this casually — coordinate with the admin's
// DEMO_PUBLIC_KEY override or the rendered demo will fail verification):
//   openssl genpkey -algorithm Ed25519 -out demo.pem
//   openssl pkey -in demo.pem -pubout -out demo.pub.pem

const HARDCODED_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIIx94b7bq8Kul1GO+w7xwVQ6SQUjKkrgywV9pXE9jEi0
-----END PRIVATE KEY-----
`;

const HARDCODED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAbPlwfGwQekR2uK5D5lVqBblSEgHdmJDQsWguAAesyqM=
-----END PUBLIC KEY-----
`;

function resolvePem(envVar: string, fallback: string): string {
  const raw = (process.env[envVar] || '').trim();
  if (!raw) return fallback;
  // Tolerate literal "\n" sequences (common when PEM is set inline in .env).
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export const DEMO_PRIVATE_KEY = resolvePem('DEMO_PRIVATE_KEY', HARDCODED_PRIVATE_KEY);
export const DEMO_PUBLIC_KEY = resolvePem('DEMO_PUBLIC_KEY', HARDCODED_PUBLIC_KEY);

export const DEMO_KEYS = {
  privateKey: DEMO_PRIVATE_KEY,
  publicKey: DEMO_PUBLIC_KEY,
};
