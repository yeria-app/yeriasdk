# Deeplink Implementation Specification

How Yeria should handle deep links for:

- opening a Yeria service from another Yeria service
- opening a Yeria service from an external system
- carrying bounded context between navigation domains
- preserving the SDK's current provider URL lock model

This document defines the navigation contract. It does **not** define a new
provider transport. Provider URLs remain scoped to the current service.

---

## Implementation status

Last reviewed: 2026-07-24.

### Implemented

- canonical custom-scheme and HTTPS routes:
  - `/dl/s/{serviceId}`
  - `/dl/v/{serviceId}?p={providerRelativePath}`
  - `/dl/c/{serviceId}`
  - `/dl/p/{serviceId}`
  - `/dl/n/{serviceId}`
- string service identifiers using the URL-safe
  `[A-Za-z0-9._~-]{1,128}` contract
- strict app-side parsing and rejection of unknown routes, hosts, schemes,
  fragments, extra parameters, and traversing component paths
- authentication-aware pending navigation for links received before login
- native app links, notification links, and links opened from rendered Yeria
  components through the same router
- service resolution and service-base boundary enforcement before fetching a
  target component
- country availability resolved from service metadata; an incompatible current
  country requires an explicit user choice before provider loading or mutation
- explicit user confirmation before `pin` and `subscribe` mutations, with
  idempotent handling when the requested state already exists
- clickable Yeria links in Reader views and canonical-link interception in
  Card and Carousel actions; provider-relative targets retain their existing
  service-scoped behavior
- JavaScript/TypeScript and Python `YeriaLink` generators for `service`,
  `component`, `chat`, `pin`, and `subscribe`, with HTTPS output by default and
  optional `yeria:` output
- a shared immutable `YeriaLink` validation golden consumed by both SDK ports,
  preventing silent divergence between WHATWG `URL` and Python `urlparse`
- Android App Links, iOS Universal Links, and Docker-generated association
  files; production deployment still needs the real Play signing fingerprint
  and Apple Team ID in its environment

### Deferred

- `/handoff?token=...`
- handoff-token issuance, signature verification, redemption, expiration, and
  replay protection
- service-to-service or external contextual launches that require sensitive or
  replay-sensitive business context

Until the handoff contract and its backend endpoints are implemented, the app
MUST reject handoff links and the SDK MUST NOT generate them. Ordinary
non-contextual service links remain fully supported.

---

## Problem statement

The current SDK model intentionally locks provider-driven navigation to the
backend of the current service:

- action views resolve against the current service URL
- form submissions resolve against the current service URL
- `next`, `prev`, `href`, and similar provider-side URLs are validated and
  treated as service-local navigation primitives

That model is correct for secure server-driven rendering, but it does **not**
solve these two cases cleanly:

1. Service A wants to open Service B
2. An external solution wants to launch a Yeria service

Those cases must not be implemented by passing arbitrary backend URLs through
provider payloads.

---

## Design goals

- Keep provider URLs scoped to the current service
- Introduce a Yeria-owned navigation namespace for cross-service routing
- Allow bounded data exchange without exposing sensitive business payloads
- Ensure every cross-service launch can be resolved by the Yeria app/router
- Preserve backend verification and user/session enforcement
- Support mobile custom scheme and web/universal-link entrypoints

---

## Non-goals

- No direct backend-to-backend invocation through deeplinks
- No arbitrary external URL execution inside the renderer
- No sensitive payload transfer in clear query parameters
- No client-side bypass of service authentication or signed payload checks

---

## Terminology

| Term | Meaning |
|---|---|
| Provider URL | A URL emitted by a service view and resolved within that same service domain |
| Yeria deeplink | A Yeria-owned route used for cross-service or external launches |
| Handoff token | A short-lived signed token carrying bounded navigation context |
| Target service | The Yeria service that must be opened |
| Source service | The Yeria service initiating the launch |

---

## Navigation domains

Yeria MUST distinguish three navigation domains.

### 1. Provider-local navigation

Used inside a service's own rendering flow.

Examples:

- action selection in `ActionList`, `ActionGrid`, `IconGrid`
- form submission
- local `href`
- local `next` / `prev`

Properties:

- resolved against the current service base URL
- remains under current service control
- MUST NOT be used for inter-service launches

### 2. Yeria deeplink navigation

Used when the destination is not simply "call the current service again".

Examples:

- open another service
- open Yeria subscription settings for a service
- open a conversation entrypoint
- open a dynamic component for a target service

Properties:

- owned and resolved by Yeria
- valid across mobile, web, and notifications
- MAY be emitted by providers, but MUST be interpreted by the Yeria app/router

### 3. Handoff navigation

Used when navigation must carry bounded context from one domain to another.

Examples:

- Service A passes an order reference to Service B
- An external system opens a Yeria service with a one-time launch context
- A notification opens a target action with contextual state

Properties:

- deeplink carries a token, not the raw payload
- token is exchanged server-side for actionable context
- token MUST be short-lived and scoped

---

## Core rule

If the target resource belongs to another service or originates outside the
current service renderer, the navigation MUST use a **Yeria deeplink**, not a
provider URL.

---

## Supported entrypoints

Yeria SHOULD support both of these entrypoint families:

### Mobile custom scheme

```text
yeria://...
```

### Web / universal link

```text
https://yeria.app/...
```

Both forms MUST resolve to the same internal route semantics.

---

## Canonical deeplink routes

This short route table is the only canonical contract. Legacy
`/service/{serviceId}/...` links are rejected rather than treated as aliases.

### Open a service

```text
yeria://dl/s/{serviceId}
https://yeria.app/dl/s/{serviceId}
```

Resolves to:

- target service lookup
- service detail or service launcher entrypoint

### Open service subscriptions

```text
yeria://dl/n/{serviceId}
https://yeria.app/dl/n/{serviceId}
```

Resolves to:

- service subscription consent UI

### Open a service component by logical path

```text
yeria://dl/v/{serviceId}?p=/orders
https://yeria.app/dl/v/{serviceId}?p=/orders
```

Resolves to:

- target service context activation
- provider fetch against the target service base URL using `p`

### Open a service chat

```text
yeria://dl/c/{serviceId}
https://yeria.app/dl/c/{serviceId}
```

Resolves to:

- target service lookup
- the existing Yeria conversation with that service, or a new one

### Pin a service

```text
yeria://dl/p/{serviceId}
https://yeria.app/dl/p/{serviceId}
```

Resolves to:

- target service and current pin-state lookup
- explicit confirmation before the idempotent mutation

### Country availability

The country is not encoded in the deeplink. Yeria resolves the service first
and uses the countries declared in its registry metadata:

- if the current country is supported, navigation continues
- if the service declares no country, it remains globally available, matching
  the registry's catalog-filter semantics
- if exactly one other country is supported, Yeria asks before switching
- if several are supported, Yeria asks the user to choose
- if the user declines, no provider request or `pin`/`subscribe` mutation runs

### Open a handoff launch

```text
yeria://handoff?token={token}
https://yeria.app/handoff?token={token}
```

Resolves to:

- token verification
- target service resolution
- context exchange
- launch of the intended screen or component

---

## Data exchange model

Deeplinks MAY carry data, but only in bounded forms.

### Allowed directly in the URL

- stable identifiers
- simple routing flags
- display mode hints
- pagination/filter hints with low sensitivity
- source metadata such as `source=notification`

Examples:

- `serviceId=42`
- `threadId=abc123`
- `tab=history`
- `source=external`

### Allowed only through a handoff token

- business references that should not be exposed openly
- pre-authorized action context
- launch intents coupled to user/session constraints
- cross-service payloads
- anything replay-sensitive

Examples:

- order transfer context
- invoice review context
- payment authorization context
- external SSO launch state

### Forbidden in the deeplink itself

- raw personal data
- secrets
- bearer tokens
- full business payloads
- raw write commands

---

## Handoff token contract

The handoff token is the standard transport for cross-domain context.

### Requirements

- MUST be signed
- MUST be short-lived
- SHOULD be one-time use when action-sensitive
- MUST identify source and target
- MUST be bound to a concrete intent
- SHOULD be auditable

### Minimum claims

| Claim | Purpose |
|---|---|
| `iss` | Issuer |
| `aud` | Intended consumer, typically Yeria or target service |
| `exp` | Expiration |
| `jti` | Unique token id for replay protection |
| `source_service_id` | Origin service if applicable |
| `target_service_id` | Target service |
| `intent` | Logical action, e.g. `open_component`, `open_conversation`, `review_order` |
| `context_ref` | Reference or compact payload identifier |
| `user_binding` | Optional user binding if launch must be user-specific |

### Recommended payload strategy

Prefer:

- compact signed token containing references

Over:

- large self-contained payloads

The target side SHOULD redeem the token for authoritative data from Yeria or
the provider backend before executing any sensitive action.

---

## Resolution flow

### A. Service A opens Service B

1. Service A emits a Yeria deeplink, not a provider URL
2. Deeplink identifies Service B directly or via handoff token
3. Yeria app/router resolves the target service
4. Yeria app activates Service B context
5. Service B receives either:
   - a provider-local path to fetch, or
   - a handoff token to redeem
6. Service B fetches and renders under its own signed-response model

### B. External system opens a Yeria service

1. External system emits a Yeria deeplink or universal link
2. Yeria app/router validates route shape
3. If a handoff token exists, Yeria verifies and redeems it
4. Yeria app checks session/auth requirements
5. Yeria opens the target service or route

### C. Notification opens a service or action

1. Notification `link` contains a Yeria deeplink
2. App notification handler parses the deeplink
3. App tracks notification open
4. Router resolves the deeplink
5. If needed, target service fetches context after launch

---

## Interaction with the current SDK

### Current provider primitives remain local

The following primitives SHOULD remain scoped to the current service backend:

- action list/grid/icon-grid action dispatch
- form submission URLs
- `setNext`
- `setPrev`
- `CardAction.href`
- similar provider-side service URLs

### Deeplinks are a separate contract

The SDK MAY expose helpers for building deeplinks, but deeplinks are not the
same thing as provider URLs.

Recommended future separation:

- `provider URL` helpers: local service navigation only
- `Yeria deeplink` helpers: inter-service and external launch only
- `handoff token` helpers: context transfer only

---

## Notification contract

Notification links SHOULD use Yeria deeplinks when the destination is:

- another service
- a Yeria-owned page
- a subscription screen
- a route requiring cross-service resolution

Examples:

```text
yeria://dl/s/42
yeria://dl/n/42
yeria://dl/c/42
yeria://handoff?token=...
```

Notification links SHOULD NOT directly embed:

- target provider backend URLs from another service
- sensitive query payloads
- raw mutation commands

---

## Validation rules

The Yeria app/router MUST validate deeplinks before resolution.

### Route validation

- scheme or universal-link host MUST be recognized
- route MUST match a supported deeplink pattern
- required identifiers MUST be present

### Token validation

- signature MUST be valid
- token MUST be unexpired
- token audience MUST match resolver expectations
- replay-sensitive tokens SHOULD be checked against `jti`

### Authorization validation

- user session MAY be required before route execution
- target service access policy MUST still apply
- deeplink resolution MUST NOT bypass provider-side authorization

---

## Error handling

The app SHOULD fail closed with user-readable outcomes.

Examples:

- invalid deeplink
- expired launch token
- unauthorized target service
- unknown target service
- target service temporarily unavailable

The app SHOULD surface a generic fallback route, such as:

- service detail
- notification center
- home page

---

## Observability

Yeria SHOULD log deeplink lifecycle events:

- received
- parsed
- validated
- rejected
- resolved
- redeemed
- launched

Recommended dimensions:

- source type: `notification`, `in_app`, `external`, `web`
- source service id
- target service id
- intent
- token presence
- outcome

---

## Security summary

- Provider URLs remain local to the current service
- Cross-service navigation uses Yeria-owned deeplinks
- Context transfer uses short-lived signed handoff tokens
- Sensitive data is not transported directly in deeplink query strings
- Final data retrieval and action execution remain server-verified

---

## Implementation phases

### Phase 1 — implemented

- canonical deeplink route table
- app-side parser/resolver and authentication-aware pending navigation
- notification, native, HTTPS, and in-app component entrypoints
- service/component/chat/pin/subscribe route behavior
- mutation confirmation for pin and subscribe

### Phase 2 — deferred

- introduce handoff token issuance and redemption
- support service-to-service launch contexts
- support external launch contexts

This phase is intentionally deferred. Its route remains unsupported until the
backend issuance/redemption contract and replay controls exist.

### Phase 3 — implemented

- SDK helper builders for canonical Yeria deeplinks
- allowed vs forbidden usage documented in JS and Python SDKs
- notification examples aligned with canonical routes
- Reader, Card, and Carousel integration for displaying/opening generated
  Yeria links

---

## Final rule of thumb

Use:

- **provider URLs** for local service rendering flows
- **Yeria deeplinks** for inter-service or external launches
- **handoff tokens** for transporting bounded context securely
