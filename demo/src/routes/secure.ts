import { Router, Request, Response } from 'express';
import { YeriaApp, YeriaKeyStore } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';
import crypto from 'crypto';

const router = Router();

// ── Yeria key-store ────────────────────────────────────────────────────
// Shared keystore for the demo. In a real provider this is created once
// at boot and lives the whole process lifetime. It resolves the `kid`
// from inbound JWT headers against
// `GET /api/v1/public/registry/public-keys/{kid}` with TTL + negative
// caching, so providers don't write key fetching / rotation handling
// themselves.
const YERIA_API_BASE = process.env.YERIA_API_BASE_URL || 'http://yeria-admin:8049';
const yeriaKeys = new YeriaKeyStore({ baseUrl: YERIA_API_BASE });

// The demo's registered Yeria service id. Real providers wire this from
// an env var at deploy time and refuse tokens scoped to a different
// service. The demo doesn't enforce it (the container has no DB row);
// when set, `/whoami` pins the audience.
const DEMO_SERVICE_ID = process.env.YERIA_SERVICE_ID
  ? Number(process.env.YERIA_SERVICE_ID)
  : null;

// Initialize a single YeriaApp instance for all secure examples
const yeriaApp = new YeriaApp({
  appId: 'demo-app-secure',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey,
});

// Initialize secure YeriaApp instance
const secureApp = new YeriaApp({
  appId: 'secure-demo-app',
  allowedDomains: ['localhost', 'yeria-demo.com'],
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey,
});

// List all secure feature demos as an ActionListView so the mobile / web
// renderer can dispatch on it (the home grid links to /api/secure expecting
// a view, not raw JSON).
router.get('/', (req: Request, res: Response) => {
  const list = yeriaApp
    .createActionListView('secure-index', 'Sécurité — Démonstrations')
    .setIntro('Signatures Ed25519, vérification de payload, gestion de clés.');
  list.addAction('/api/secure/signed-form',       'Formulaire signé',     'Form rendu + signé Ed25519 par le serveur', '🔏', false);
  list.addAction('/api/secure/verify-signature',  'Vérification de signature', 'Re-vérifier une réponse signée', '✅', false);
  list.addAction('/api/secure/rotation-demo',     'Rotation de clé',      'Comment changer la clé d\'un service côté provider', '🔄', false);
  list.addAction('/api/secure/whoami',            'Whoami (token Yeria)', 'Décodage du Bearer token reçu (per-service JWT)', '🪪', false);
  list.addAction('/api/secure/profile',           'Profil utilisateur',   'Fetch signé Ed25519 du profil par sub', '👤', false);
  list.addAction('/api/secure/encrypted-data',    'Données chiffrées',    'Reader avec contenu marqué chiffré', '🔐', false);
  list.addAction('/api/secure/config',            'Configuration',        'Réglages de sécurité', '⚙️', false);
  list.addAction('/api/secure/key-info',          'Clé publique',         'Affiche la clé Ed25519 publique du serveur', '🗝️', false);
  res.json(yeriaApp.serve(list));
});

// Signed Form - Form with Ed25519 signature
router.get('/signed-form', (req: Request, res: Response) => {
  const form = secureApp.createFormView('secure-payment', 'Secure Payment Form')
    .setNote('This form is cryptographically signed for security')
    .addField('text', 'accountNumber', 'Account Number', {
      required: true,
      minLength: 10,
      maxLength: 10,
      pattern: /^[0-9]{10}$/
    })
    .addField('text', 'amount', 'Amount', {
      required: true,
      pattern: /^[0-9]+(\.[0-9]{2})?$/,
      placeholder: '0.00'
    })
    .addField('text', 'recipient', 'Recipient Name', {
      required: true,
      minLength: 2,
      maxLength: 100
    })
    .addField('select', 'purpose', 'Transfer Purpose', {
      required: true,
      options: [
        { label: 'Payment', value: 'payment' },
        { label: 'Transfer', value: 'transfer' },
        { label: 'Refund', value: 'refund' },
        { label: 'Investment', value: 'investment' }
      ]
    })
    .addField('password', 'pin', 'Security PIN', {
      required: true,
      minLength: 4,
      maxLength: 6,
      pattern: /^[0-9]{4,6}$/
    })
    .submitButton('Process Secure Payment', 'POST');

  // The signed envelope is what the renderer expects — no place to
  // append cosmetic meta anymore (the renderer ignored it anyway).
  res.json(secureApp.serve(form));
});

// Signature Verification Demo — explains the verification flow as a Reader.
router.get('/verify-signature', (req: Request, res: Response) => {
  const reader = secureApp.createReaderView('signature-demo', 'Vérification de signature')
    .setIntro('Toutes les vues servies par Yeria SDK sont signées Ed25519. Le client peut re-vérifier la signature avec la clé publique du serveur.')
    .addSubTitle('Flux')
    .addParagraph('1. Le serveur sérialise la vue puis signe la chaîne `{view, timestamp, appId}` en Ed25519.')
    .addParagraph('2. La réponse contient `{appId, signature, timestamp, view}`.')
    .addParagraph('3. Le client récupère la clé publique via `/api/secure/key-info`.')
    .addParagraph('4. Le client vérifie : POST `/api/secure/verify` avec la réponse complète → le serveur répond `{valid: true|false}`.')
    .addSubTitle('Pourquoi')
    .addParagraph('La signature garantit qu\'aucun intermédiaire n\'a modifié la vue. Combinée avec un `timestamp` borné par `viewExpirationMinutes`, elle rejette les rejeux.');
  res.json(secureApp.serve(reader));
});

// Rotation Demo — explains the key rotation flow as a Reader.
router.get('/rotation-demo', (req: Request, res: Response) => {
  const reader = secureApp.createReaderView('rotation-demo', 'Rotation de clé Ed25519')
    .setIntro('Un service peut changer sa clé de signature sans intervention d\'un opérateur Yeria. La rotation est auto-signée par la clé courante encore valide.')
    .addSubTitle('Quand pivoter')
    .addParagraph('• Compromission soupçonnée de la clé privée.')
    .addParagraph('• Roulement périodique recommandé (par ex. tous les 6 mois).')
    .addParagraph('• Changement d\'environnement / migration.')
    .addSubTitle('Flux côté provider (SDK JS)')
    .addCodeBlock(
      `import { YeriaApp } from '@numerum-tech/yeriasdk';\n` +
      `import { generateKeyPairSync } from 'crypto';\n\n` +
      `const app = new YeriaApp({ appId: 'mon-service', privateKey: CURRENT_PRIV, publicKey: CURRENT_PUB });\n\n` +
      `// 1) Générer la nouvelle paire\n` +
      `const kp = generateKeyPairSync('ed25519');\n` +
      `const newPriv = kp.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;\n` +
      `const newPub  = kp.publicKey.export({ type: 'spki',  format: 'pem' }) as string;\n\n` +
      `// 2) Demander la rotation. Yeria vérifie la signature avec la clé\n` +
      `// courante avant d'enregistrer la nouvelle.\n` +
      `await app.rotateKey('https://yeria.app', SERVICE_ID, { privateKey: newPriv, publicKey: newPub });\n\n` +
      `// 3) Persister newPriv / newPub côté provider et oublier l'ancienne\n` +
      `// au plus tard 5 minutes après (fenêtre de chevauchement).`,
      'typescript'
    )
    .addSubTitle('Endpoint Yeria')
    .addParagraph('`POST /api/v1/services/:id/keys/rotate`')
    .addParagraph('Body: `{ envelope: { serviceId, newPublicKey, timestamp }, signature, currentPublicKey }`')
    .addSubTitle('Fenêtre de grâce')
    .addParagraph('Pendant ~5 minutes après une rotation, l\'ancienne et la nouvelle clé valident toutes les deux. Cela évite que les réponses signées encore en transit soient rejetées par le renderer.')
    .addSubTitle('Révocation immédiate')
    .addParagraph('En cas de compromission, `DELETE /api/v1/services/:id/keys/:keyId` expire la clé tout de suite — sans grâce.');
  res.json(secureApp.serve(reader));
});

// Whoami — decode the `Authorization: Bearer …` header (a per-service
// Yeria JWT) and render the resulting claims as a Reader. Demonstrates
// how a provider authenticates inbound requests using `YeriaApp.verifyUserToken`.
//
// Expected aud == the provider's service id. We don't know the service id
// for the demo at runtime (the demo is registered as a Yeria service but
// the demo container has no DB), so this route accepts ANY audience and
// just surfaces what it sees. A real provider passes its own service id
// as the third argument and rejects mismatches.
// Extract `Authorization: Bearer …` from an Express request.
function extractBearer(req: Request): string {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof headerValue !== 'string' || !headerValue.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return headerValue.slice(7).trim();
}

// Whoami — verify the inbound Yeria service token using the kid-aware
// resolver pattern. Demonstrates how a provider authenticates inbound
// requests with `YeriaApp.verifyUserTokenWithResolver` + `YeriaKeyStore`.
router.get('/whoami', async (req: Request, res: Response) => {
  const reader = secureApp.createReaderView('whoami', 'Token Yeria — Whoami');
  const bearer = extractBearer(req);

  if (!bearer) {
    reader
      .setIntro('Aucun Authorization: Bearer reçu — ouvre cette vue depuis le mobile Yeria (qui attache le token de service).')
      .addSubTitle('À quoi sert ce token ?')
      .addParagraph('Yeria émet un JWT par service au lancement (audience = service_id, TTL ~2h). Le mobile l\'envoie à chaque requête vers le backend du service. Le provider vérifie la signature avec la clé publique Yeria — résolue dynamiquement par `kid` via `YeriaKeyStore`.');
    res.json(secureApp.serve(reader));
    return;
  }

  try {
    // Resolver pattern: the SDK pulls `kid` from the JWT header and asks
    // the keystore for the matching PEM. Returns null when Yeria says
    // the key is expired or unknown — the SDK then throws.
    //
    // DEMO_SERVICE_ID may be null when the demo isn't pinned to a
    // specific Yeria service row. Real providers always pass it.
    const claims = await YeriaApp.verifyUserTokenWithResolver(
      bearer,
      (kid) => yeriaKeys.getByKid(kid),
      DEMO_SERVICE_ID ?? undefined,
    );
    const exp = new Date(claims.exp * 1000).toISOString();
    reader
      .setIntro('Le token Yeria a été vérifié avec la clé publique du registre, résolue dynamiquement par `kid`.')
      .addSubTitle('Claims décodés')
      .addParagraph(`**Utilisateur (sub):** ${claims.sub}`)
      .addParagraph(`**Audience (aud):** ${claims.aud}`)
      .addParagraph(`**Émetteur (iss):** ${claims.iss}`)
      .addParagraph(`**Expire le:** ${exp}`)
      .addParagraph(`**Key id (kid):** ${claims.kid || '(none)'}`)
      .addSubTitle('Vérification')
      .addParagraph('SDK: `YeriaApp.verifyUserTokenWithResolver(bearer, (kid) => keys.getByKid(kid), serviceId)`')
      .addParagraph('Yeria resolves the PEM only when the key is still trusted (`state ∈ {active, rotating}`). Retired keys return `state: expired` with no PEM — the SDK throws, the provider rejects the token.');
  } catch (err) {
    reader
      .setIntro('Vérification échouée — le token n\'est pas valide.')
      .addSubTitle('Raison')
      .addParagraph(err instanceof Error ? err.message : String(err))
      .addParagraph('Causes courantes : signature invalide, expiration, mauvaise audience, mauvais issuer, ou format JWT incorrect.');
  }

  res.json(secureApp.serve(reader));
});

// Profile — given an inbound user token, fetch the user's profile from
// Yeria via the Ed25519-signed
// `POST /api/v1/provider/services/{sid}/users/{uid}/profile` endpoint.
// In a real provider this happens only on cache miss (the first time
// this user hits the service) — the profile is then persisted locally
// keyed by `sub`. The demo always fetches to keep the flow obvious.
router.get('/profile', async (req: Request, res: Response) => {
  const reader = secureApp.createReaderView('profile', 'Yeria — Profil utilisateur');
  const bearer = extractBearer(req);

  if (!bearer) {
    reader
      .setIntro('Aucun Authorization: Bearer reçu — ouvre cette vue depuis le mobile Yeria.')
      .addSubTitle('Pourquoi un fetch séparé ?')
      .addParagraph('Le token (verifyUserToken) prouve l\'identité — il ne porte que `sub`, `aud`, `exp`. Pour le KYC le provider appelle Yeria, signé Ed25519 avec sa clé de service, et reçoit les champs autorisés. Aucun JWT utilisateur n\'est transmis dans la requête signée.');
    res.json(secureApp.serve(reader));
    return;
  }

  if (DEMO_SERVICE_ID === null) {
    reader
      .setIntro('Demo non lié à un service Yeria (env `YERIA_SERVICE_ID` non défini).')
      .addParagraph('Définissez `YERIA_SERVICE_ID` côté demo et déclarez la même valeur côté Yeria pour activer cette démo.');
    res.json(secureApp.serve(reader));
    return;
  }

  try {
    // 1. Verify the inbound user token to extract `sub`.
    const claims = await YeriaApp.verifyUserTokenWithResolver(
      bearer,
      (kid) => yeriaKeys.getByKid(kid),
      DEMO_SERVICE_ID,
    );

    // 2. Fetch the user's profile from Yeria with this service's Ed25519
    //    signing key. No bearer travels in the body.
    const profile = await YeriaApp.fetchUserProfile({
      baseUrl: YERIA_API_BASE,
      serviceId: DEMO_SERVICE_ID,
      userId: claims.sub,
      privateKey: DEMO_KEYS.privateKey,
    });

    reader
      .setIntro('Profil récupéré via l\'endpoint signé `/api/v1/provider/services/{sid}/users/{uid}/profile`.')
      .addSubTitle('Identité')
      .addParagraph(`**Yeria sub:** ${claims.sub}`)
      .addParagraph(`**Audience (aud):** ${claims.aud}`)
      .addSubTitle('Profil')
      .addParagraph(`**Prénom:** ${profile.first_name ?? '(non communiqué)'}`)
      .addParagraph(`**Nom:** ${profile.last_name ?? '(non communiqué)'}`)
      .addParagraph(`**Pays:** ${profile.country_code ?? '(non communiqué)'}`)
      .addSubTitle('Persistance recommandée')
      .addParagraph('Le provider stocke le profil en base locale (clé = `yeria_sub`) au premier hit, puis sert toutes les requêtes suivantes en local. Yeria n\'est rappelé que lors d\'un refresh manuel ou d\'un webhook.');
  } catch (err) {
    reader
      .setIntro('Récupération échouée.')
      .addSubTitle('Raison')
      .addParagraph(err instanceof Error ? err.message : String(err));
  }

  res.json(secureApp.serve(reader));
});

// Encrypted Data Reader - Simulated encrypted data
router.get('/encrypted-data', (req: Request, res: Response) => {
  const reader = secureApp.createReaderView('encrypted-reader', 'Encrypted Data')
    .setIntro('Sensitive information (decrypted for display)')
    .addParagraph('**Social Security Number:** ***-**-6789')
    .addParagraph('**Credit Card:** ****-****-****-1234')
    .addParagraph('**Bank Account:** ******7890')
    .addParagraph('**API Key:** sk_live_****************xyz')
    .addSubTitle('Security Details')
    .addParagraph('🔒 Private keys are encrypted and stored securely')
    .addParagraph('**Encryption:** AES-256-GCM')
    .addParagraph('**Key Derivation:** PBKDF2 with 100,000 iterations');

  // Signed envelope is the wire shape — no cosmetic `security` metadata
  // around the payload (renderer ignored it anyway).
  res.json(secureApp.serve(reader));
});

// Security Configuration — rendered as a ReaderView so the mobile/web
// renderer can display it directly.
router.get('/config', (req: Request, res: Response) => {
  const reader = secureApp.createReaderView('secure-config', 'Configuration de sécurité')
    .setIntro('Paramètres effectifs de l\'instance secureApp utilisée par cette démo.')
    .addSubTitle('Vue / signature')
    .addParagraph('**App ID :** secure-demo-app')
    .addParagraph('**Algorithme de signature :** Ed25519 (clé 256 bits)')
    .addParagraph('**Expiration des vues :** 30 minutes')
    .addParagraph('**Domaines autorisés :** localhost, yeria-demo.com')
    .addSubTitle('Sécurité applicative (référence)')
    .addParagraph('**Chiffrement au repos :** AES-256-GCM')
    .addParagraph('**Hachage :** SHA-256')
    .addParagraph('**Dérivation de clé :** PBKDF2 (100 000 itérations)')
    .addParagraph('**Transport :** TLS 1.3');
  res.json(secureApp.serve(reader));
});

// Public Key — rendered as a ReaderView with the PEM block in a code element.
router.get('/key-info', (req: Request, res: Response) => {
  const publicKey = secureApp.getPublicKey();
  const keyFingerprint = crypto
    .createHash('sha256')
    .update(publicKey)
    .digest('hex')
    .match(/.{2}/g)?.join(':') || '';

  const reader = secureApp.createReaderView('secure-key-info', 'Clé publique Ed25519')
    .setIntro('Cette clé publique permet à un client de vérifier les signatures servies par le serveur.')
    .addSubTitle('Empreinte (SHA-256)')
    .addParagraph(keyFingerprint)
    .addSubTitle('Clé (PEM)')
    .addCodeBlock(publicKey, 'pem')
    .addSubTitle('Usage')
    .addParagraph('1. Stocker la clé côté client (ou la fetcher au démarrage).')
    .addParagraph('2. Comparer l\'empreinte affichée avec celle persistée pour détecter une rotation/MITM.')
    .addParagraph('3. Utiliser la clé pour vérifier `signature` à chaque réponse SDK reçue.');
  res.json(secureApp.serve(reader));
});

// Signature verification endpoint. Caller posts the same envelope shape
// returned by serve(): `{ payload: <json string>, signature: <base64> }`.
router.post('/verify', (req: Request, res: Response) => {
  const { payload, signature } = req.body || {};

  try {
    if (typeof payload !== 'string' || typeof signature !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'payload (string) and signature (string) are required'
      });
    }
    const publicKey = secureApp.getPublicKey();
    const isValid = YeriaApp.verifySignature(publicKey, payload, signature);

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'Signature is valid' : 'Signature verification failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Verification error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process secure payment (mock)
router.post('/process-payment', (req: Request, res: Response) => {
  const paymentData = req.body;
  
  // In production, verify the signature of the request
  // Process payment securely
  
  res.json({
    success: true,
    message: 'Payment processed securely',
    transactionId: `TXN-${Date.now()}`,
    timestamp: new Date().toISOString(),
    security: {
      signed: true,
      encrypted: true,
      audit: 'Logged'
    }
  });
});

export default router;