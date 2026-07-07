"""Shared protocol types for the Yeria SDK — mirrors js/src/core/yeria-protocol.ts.

Types-only module: the wire/protocol shapes shared across the signer, verifiers,
platform client and UI. Kept in one place to avoid circular imports.
"""

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional


@dataclass
class SignedEnvelope:
    """Output of ``serve()`` — the whole object goes on the wire as a JSON
    envelope. ``payload`` is the exact JSON string that was signed; the client
    verifies the signature on those bytes, then parses ``payload``."""

    payload: str    # JSON string of {appId, timestamp, view}
    signature: str  # Ed25519 signature over `payload` (base64)


@dataclass
class DecodedPayload:
    """Parsed inner payload — mirrors the JS DecodedPayload."""

    app_id: str
    timestamp: int
    view: Dict[str, Any]


@dataclass
class YeriaTokenClaims:
    """Claims surfaced by ``verify_yeria_token``."""

    sub: str             # user id (opaque)
    aud: str             # "yeria" (platform) or the service id for a service token
    iss: str             # always "yeria"
    exp: int             # unix seconds
    iat: Optional[int] = None
    kid: Optional[str] = None  # from JWT header


@dataclass
class UserDetails:
    """Projection returned by ``YeriaPlatform.fetch_user_details``. ``user_id``
    is the user's opaque id (not a sequential integer)."""

    user_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    country_code: Optional[str] = None
    email: Optional[str] = None


@dataclass
class YeriaPublicKey:
    """Yeria's active backend signing key, from
    ``GET /api/v1/public/registry/public-key``."""

    public_key: str        # PEM
    key_id: str            # kid of the active key
    algorithm: Optional[str] = None
    expires_at: Optional[str] = None


# Resolver passed to verify_yeria_token_with_resolver — given the kid from the
# JWT header, returns the PEM to verify against, or None when expired/unknown.
PublicKeyResolver = Callable[[str], Optional[str]]
