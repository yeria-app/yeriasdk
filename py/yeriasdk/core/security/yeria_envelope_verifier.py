"""YeriaEnvelopeVerifier — verifies the integrity of a signed view envelope
against the service public key + appId + expiration. Mirrors
js/src/core/security/yeria-envelope-verifier.ts.
"""

import base64
import json
import time
from typing import Any, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from ..yeria_protocol import SignedEnvelope
from ...errors.exceptions import (
    AppIdMismatchError,
    ViewExpiredError,
    SignatureVerificationError,
)


class YeriaEnvelopeVerifier:
    """Verifies a signed VIEW envelope produced by a provider, against the
    service public key. Owned by YeriaUI.

    ``verify_integrity`` checks (1) the Ed25519 signature over the payload
    bytes, (2) that the envelope's appId matches, and (3) that the view has not
    expired; it raises SignatureVerificationError / AppIdMismatchError /
    ViewExpiredError and is fail-closed (any unexpected error becomes a
    SignatureVerificationError). The static ``verify_signature`` is the
    low-level stateless boolean check.

    Not: this verifies provider view envelopes only -- it is distinct from
    YeriaSigner (signs) and YeriaUserTokenVerifier (verifies Yeria-issued user
    JWTs).
    """

    def __init__(self, app_id: str, public_key: str, view_expiration_minutes: int = 60):
        self._app_id = app_id
        self._public_key = serialization.load_pem_public_key(public_key.encode(), backend=default_backend())
        self._view_expiration_minutes = view_expiration_minutes

    def set_public_key(self, public_key: str) -> None:
        """Swap the service public key (e.g. after a key rotation)."""
        self._public_key = serialization.load_pem_public_key(public_key.encode(), backend=default_backend())

    def verify_integrity(self, envelope: SignedEnvelope) -> bool:
        """Verify signature, appId match and view freshness; raises on any failure."""
        try:
            try:
                self._public_key.verify(base64.b64decode(envelope.signature), envelope.payload.encode("utf-8"))
            except Exception:
                raise SignatureVerificationError(self._app_id)

            decoded = json.loads(envelope.payload)
            if decoded.get("appId") != self._app_id:
                raise AppIdMismatchError(self._app_id, decoded.get("appId", ""))

            now = int(time.time() * 1000)
            expiration_time = self._view_expiration_minutes * 60 * 1000
            age = now - int(decoded.get("timestamp", 0))
            if age > expiration_time:
                view_id = (decoded.get("view") or {}).get("id", "unknown")
                raise ViewExpiredError(view_id, age, expiration_time)
            return True
        except (AppIdMismatchError, ViewExpiredError, SignatureVerificationError):
            raise
        except Exception as e:
            raise SignatureVerificationError(self._app_id) from e

    @staticmethod
    def verify_signature(public_key: str, payload: str, signature: str, on_error: Optional[Any] = None) -> bool:
        """Low-level stateless check: is ``signature`` a valid Ed25519 signature over ``payload``?"""
        try:
            key = serialization.load_pem_public_key(public_key.encode(), backend=default_backend())
            key.verify(base64.b64decode(signature), payload.encode("utf-8"))
            return True
        except Exception as error:
            if on_error:
                on_error(error)
            return False
