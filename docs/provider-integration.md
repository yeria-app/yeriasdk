# Provider integration

How a provider plugs its backend into Yeria's per-audience JWT flow using
the SDK helpers. Two language sketches; same protocol.

The SDK ships **helpers, not middleware**. Wire them into your own auth
layer (Express middleware, FastAPI dependency, Total.js handler, …).
There is no `YeriaApp.authMiddleware()` and there never will be — framework
integration is your call.

---

## What you get from Yeria

| Resource | Endpoint | Purpose |
|---|---|---|
| Public key (active) | `GET /api/v1/public/registry/public-key` | Yeria's current JWT-signing public key |
| Public key by `kid` | `GET /api/v1/public/registry/public-keys/{kid}` | kid-aware lookup; PEM only when state ∈ `{active, rotating}` |
| Service-scoped JWT | `POST /api/v1/user/service-token` (mobile/web client) | Mobile/web client mints a token scoped to your `service_id` |
| User profile | `POST /api/v1/provider/services/{sid}/users/{uid}/profile` | Provider-signed (Ed25519) lookup of a Yeria user by `sub` |

You only call (#2) and (#4). The rest is handled by Yeria + the client.

---

## What you store

The Ed25519 keypair you registered when you created your service. The
public key sits in Yeria's `apikeys` table. The private key never leaves
your backend.

| Env var | Purpose |
|---|---|
| `YERIA_BASE_URL` | e.g. `https://yeria.app`. Trailing slash optional. |
| `YERIA_SERVICE_ID` | Numeric id of your service in Yeria's `services` table. |
| `SERVICE_ED25519_PRIVATE_KEY` | PEM string of your service's Ed25519 private key. Same key you sign view envelopes with. |

---

## Request lifecycle

```
[Mobile] -- Bearer <serviceJWT> --> [Provider backend]
                                          |
                                          | 1. verifyUserTokenWithResolver
                                          |    (resolver = YeriaKeyStore.getByKid)
                                          |
                                          | 2. cache miss? fetchUserProfile
                                          |    (signs envelope, POSTs to Yeria)
                                          |
                                          | 3. handler logic
                                          v
                                  [render / persist / respond]
```

Hot path = step 1 only (signature math, no network). Step 2 fires on the
first hit per user, then never again — provider persists the profile by
`sub` and serves locally afterwards. Step 3 is your business code.

---

## JavaScript / TypeScript

```ts
import express from 'express';
import {
  YeriaApp,
  YeriaKeyStore,
  SignatureVerificationError,
  ViewExpiredError,
} from '@numerum-tech/yeriasdk';

const keys = new YeriaKeyStore({ baseUrl: process.env.YERIA_BASE_URL! });
const SERVICE_ID = Number(process.env.YERIA_SERVICE_ID!);
const SERVICE_PRIVATE_KEY = process.env.SERVICE_ED25519_PRIVATE_KEY!;

// Provider's own middleware — NOT shipped by the SDK.
async function requireYeriaUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const auth = req.headers.authorization ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!bearer) {
    return res.status(401).json({ error: 'missing token' });
  }

  try {
    const claims = await YeriaApp.verifyUserTokenWithResolver(
      bearer,
      (kid) => keys.getByKid(kid),
      SERVICE_ID,
    );
    (req as any).yeriaUser = claims;
    next();
  } catch (err) {
    if (err instanceof ViewExpiredError) {
      return res.status(401).json({ error: 'token expired' });
    }
    if (err instanceof SignatureVerificationError) {
      // Force-refresh the key once: Yeria may have rotated and our cache
      // is stale. The next request retries with the fresh key.
      const kid = (err as any).viewId ?? null;
      if (typeof kid === 'string') keys.invalidate(kid);
      return res.status(401).json({ error: 'invalid token' });
    }
    return res.status(500).json({ error: 'auth error' });
  }
}

const app = express();
app.use('/secure', requireYeriaUser);

// Inside a handler:
app.get('/secure/me', async (req, res) => {
  const claims = (req as any).yeriaUser;

  // Cache miss → fetch from Yeria once, persist locally.
  let user = await db.users.findByYeriaSub(claims.sub);
  if (!user) {
    const profile = await YeriaApp.fetchUserProfile({
      baseUrl: process.env.YERIA_BASE_URL!,
      serviceId: SERVICE_ID,
      userId: claims.sub,
      privateKey: SERVICE_PRIVATE_KEY,
    });
    user = await db.users.insert({ yeria_sub: claims.sub, ...profile });
  }

  res.json({ id: user.id, first_name: user.first_name });
});
```

### What the helpers do

| Helper | Inputs | What it does |
|---|---|---|
| `YeriaKeyStore` | `{baseUrl, ttlMs?, fetch?}` | TTL-cached lookup of Yeria public keys by `kid`. Negative caching for expired/unknown. |
| `keys.getByKid(kid)` | `kid` from JWT header | PEM if trusted, `null` if not. The SDK treats `null` as "reject the token". |
| `keys.invalidate(kid)` | `kid` | Drops a single cache entry. Call after a verify failure to force a refetch on the retry. |
| `YeriaApp.verifyUserTokenWithResolver` | `(jwt, resolver, expectedServiceId?)` | RS256 verify with kid-aware key lookup. Enforces `iss='yeria'`, optional `aud=<expectedServiceId>`, `exp > now`. |
| `YeriaApp.fetchUserProfile` | `{baseUrl, serviceId, userId, privateKey, fetch?}` | Builds Ed25519-signed envelope, POSTs to Yeria, returns `{user_id, first_name, last_name, country_code}`. |

---

## Python

```python
from yeriasdk import YeriaApp, YeriaKeyStore
from yeriasdk.errors.exceptions import SignatureVerificationError, ViewExpiredError

keys = YeriaKeyStore(base_url=os.environ["YERIA_BASE_URL"])
SERVICE_ID = int(os.environ["YERIA_SERVICE_ID"])
SERVICE_PRIVATE_KEY = os.environ["SERVICE_ED25519_PRIVATE_KEY"]

# FastAPI dependency — written by the provider, NOT shipped by the SDK.
from fastapi import Depends, Header, HTTPException

async def require_yeria_user(authorization: str = Header(default="")):
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "missing token")
    bearer = authorization[7:].strip()
    try:
        return YeriaApp.verify_user_token_with_resolver(
            bearer, keys.get_by_kid, SERVICE_ID,
        )
    except ViewExpiredError:
        raise HTTPException(401, "token expired")
    except SignatureVerificationError as e:
        # Force-refresh on next attempt — covers a rotated key.
        kid = getattr(e, "view_id", None)
        if isinstance(kid, str):
            keys.invalidate(kid)
        raise HTTPException(401, "invalid token")

# Inside a handler:
@app.get("/secure/me")
async def me(claims = Depends(require_yeria_user)):
    user = db.users.find_by_yeria_sub(claims.sub)
    if user is None:
        profile = YeriaApp.fetch_user_profile(
            base_url=os.environ["YERIA_BASE_URL"],
            service_id=SERVICE_ID,
            user_id=claims.sub,
            private_key=SERVICE_PRIVATE_KEY,
        )
        user = db.users.insert(yeria_sub=claims.sub, **dataclasses.asdict(profile))
    return {"id": user.id, "first_name": user.first_name}
```

---

## Key rotation behaviour

Yeria rotates its JWT-signing key automatically once it crosses 90 % of
its TTL. When this happens:

1. The retired key transitions to `state: rotating` for a 5-minute grace
   window. Tokens already minted under it still verify.
2. After 5 min, the retired key transitions to `state: expired`. Yeria's
   `/public-keys/{kid}` endpoint no longer returns its PEM — only the
   state. `YeriaKeyStore.getByKid` returns `null`. The SDK throws.
3. Tokens minted under the new key carry the new `kid` in their header.
   The keystore fetches the new PEM on first encounter, caches it.

You do not need to restart your provider when Yeria rotates. The
keystore handles the transition transparently.

If a stolen key is revoked manually (not part of the routine rotation),
the next inbound token signed by it fails verify → middleware calls
`keys.invalidate(kid)` → retry → resolver returns `null` (expired) →
token rejected. Fresh tokens minted after revocation use a new `kid` and
verify normally.

---

## Persistence model

Mirror Yeria's `sub` into your own `users` table. The `sub` is stable
for the user's Yeria account lifetime and is the only field guaranteed
to be present in every per-service token.

```sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    yeria_sub     TEXT UNIQUE NOT NULL,
    first_name    TEXT,
    last_name     TEXT,
    country_code  CHAR(2),
    fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- your own provider-specific fields below
    kyc_status    TEXT,
    ...
);
CREATE INDEX users_yeria_sub_idx ON users (yeria_sub);
```

Refresh policy is yours. Options:

- **TTL** — re-call `fetchUserProfile` when `fetched_at` is older than 24 h.
- **On demand** — let the user trigger a "refresh from Yeria" in their settings.
- **Webhook** — when Yeria ships a `profile-changed` webhook (out of scope), call `fetchUserProfile` on receipt.

---

## What is NOT in the body

Provider-signed calls (`fetchUserProfile`, key rotation) **never** carry
the user's JWT. The credential is the Ed25519 signature on the envelope
metadata, made with the service's registered private key. Yeria already
holds every Active public key for the service, so the body doesn't
nominate which key signed — Yeria iterates its registered keys for that
service and accepts any match. This keeps the wire shape minimal and
avoids leaking bearer tokens into logs of signed payloads.

---

## Errors quick reference

| SDK error | Likely cause | Right HTTP response |
|---|---|---|
| `SignatureVerificationError` | Wrong key, tampered token, expired-state from keystore | 401 |
| `ViewExpiredError` | `exp` is in the past | 401 |
| `Error: Yeria profile fetch failed: ...` | Provider misconfigured or Yeria refused the signed envelope (wrong service_id, replay, expired key) | 502 / 503 (your call) |
| `Error: Yeria profile fetch: unexpected response shape` | Yeria upgraded the response shape and your SDK is older | Upgrade SDK |
