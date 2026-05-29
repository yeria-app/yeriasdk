"""
YeriaApp class - Factory for creating views and handling secure signing/verification
"""

import json
import time
from typing import Any, Callable, Dict, Optional
from dataclasses import dataclass

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from .base_view import BaseView
from ..errors.exceptions import (
    AppIdMismatchError,
    ViewExpiredError,
    SignatureVerificationError,
    ConfigurationError,
    ExternalError,
)
from ..types.models import SecureNotificationResponse


@dataclass
class YeriaAppConfig:
    """Configuration for YeriaApp"""

    app_id: str
    private_key: Optional[str] = None  # Ed25519 private key (PEM format)
    public_key: Optional[str] = None  # Ed25519 public key (PEM format)
    allowed_domains: Optional[list] = None
    view_expiration_minutes: int = 60
    platform_url: Optional[str] = None  # City-Mate platform endpoint URL for notifications
    notification_timeout: int = 5  # HTTP request timeout in seconds (default: 5)


@dataclass
class SignedEnvelope:
    """Output of `serve()` — the whole object goes on the wire as a JSON
    envelope (Flask: ``return jsonify(asdict(envelope))``). The signature
    CANNOT be forgotten because it lives in the structure itself, not in
    a header.

    `payload` is a JSON string (already serialised) — it's the bytes
    that were signed. The renderer verifies the signature on those
    bytes, then JSON.parses `payload` to get the decoded view envelope.
    No re-stringification on either side, so JS/Python/Dart can't drift
    on JSON encoding.
    """

    payload: str    # JSON string of {appId, timestamp, view}
    signature: str  # Ed25519 signature over `payload` (base64)


@dataclass
class DecodedPayload:
    """Parsed inner payload — mirrors the JS DecodedPayload."""

    app_id: str
    timestamp: int
    view: Dict[str, Any]


@dataclass
class UserTokenClaims:
    """Claims surfaced by ``YeriaApp.verify_user_token``.

    Mirrors the JS :class:`UserTokenClaims` interface.
    """

    sub: str             # Yeria user id
    aud: str             # "yeria" (platform) or service id (string) for service-scoped
    iss: str             # always "yeria"
    exp: int             # unix seconds
    iat: Optional[int] = None
    kid: Optional[str] = None  # from JWT header


@dataclass
class UserProfile:
    """Projection returned by ``YeriaApp.fetch_user_profile``. Intentionally
    minimal — per-service scopes (``service_access.profile_scopes``) will
    widen this set without changing field names.
    """

    user_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    country_code: Optional[str] = None


# Resolver passed to verify_user_token_with_resolver — given the kid from
# the JWT header, returns the PEM the SDK should verify against, or None
# when the key is expired / unknown.
PublicKeyResolver = Callable[[str], Optional[str]]


class YeriaApp:
    """Factory class for creating views and handling secure signing/verification"""

    def __init__(self, config: YeriaAppConfig):
        self.config = YeriaAppConfig(
            app_id=config.app_id,
            private_key=config.private_key,
            public_key=config.public_key,
            allowed_domains=config.allowed_domains or [],
            view_expiration_minutes=config.view_expiration_minutes or 60,
            platform_url=getattr(config, 'platform_url', None),
            notification_timeout=getattr(config, 'notification_timeout', 5),
        )

        # Generate or use Ed25519 keys
        if config.private_key and config.public_key:
            self._private_key = self._load_private_key(config.private_key)
            self._public_key = self._load_public_key(config.public_key)
        else:
            # Generate new key pair
            private_key = Ed25519PrivateKey.generate()
            public_key = private_key.public_key()

            self._private_key = private_key
            self._public_key = public_key

    def _load_private_key(self, pem_key: str) -> Ed25519PrivateKey:
        """Load private key from PEM format"""
        return serialization.load_pem_private_key(
            pem_key.encode(), password=None, backend=default_backend()
        )

    def _load_public_key(self, pem_key: str) -> Ed25519PublicKey:
        """Load public key from PEM format"""
        return serialization.load_pem_public_key(
            pem_key.encode(), backend=default_backend()
        )

    def get_public_key(self) -> str:
        """Get public key in PEM format for frontend verification"""
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()

    def serve(self, view: BaseView) -> SignedEnvelope:
        """Serialise a view, sign the bytes, and return an envelope to send
        as-is (Flask: ``return jsonify(asdict(envelope))``).

        The signature is part of the returned structure — impossible to
        forget when sending. The client verifies on `payload` (string)
        without re-stringification.
        """
        import base64

        decoded = {
            "appId": self.config.app_id,
            "timestamp": int(time.time() * 1000),
            "view": view.to_json(),
        }
        payload = json.dumps(decoded)
        signature_bytes = self._private_key.sign(payload.encode("utf-8"))
        signature = base64.b64encode(signature_bytes).decode()
        return SignedEnvelope(payload=payload, signature=signature)

    def create_form_view(
        self, form_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a form view"""
        from ..views.form_view import FormView
        return FormView(form_id, title, process_id)

    def create_reader_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a reader view"""
        from ..views.reader_view import ReaderView
        return ReaderView(view_id, title, process_id)

    def create_action_list_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create an action list view"""
        from ..views.action_list_view import ActionListView
        return ActionListView(view_id, title, process_id)

    def create_action_grid_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create an action grid view"""
        from ..views.action_grid_view import ActionGridView
        return ActionGridView(view_id, title, process_id)

    def create_qr_scan_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a QR scan view"""
        from ..views.qr_scan_view import QRScanView
        return QRScanView(view_id, title, process_id)

    def create_qr_display_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a QR display view"""
        from ..views.qr_display_view import QRDisplayView
        return QRDisplayView(view_id, title, process_id)

    def create_message_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a message view"""
        from ..views.message_view import MessageView
        return MessageView(view_id, title, process_id)

    def create_card_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a card view"""
        from ..views.card_view import CardView
        return CardView(view_id, title, process_id)

    def create_carousel_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a carousel view"""
        from ..views.carousel_view import CarouselView
        return CarouselView(view_id, title, process_id)

    def create_timeline_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a timeline view"""
        from ..views.timeline_view import TimelineView
        return TimelineView(view_id, title, process_id)

    def create_media_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a media view"""
        from ..views.media_view import MediaView
        return MediaView(view_id, title, process_id)

    def create_map_view(
        self, view_id: str, title: str, process_id: Optional[str] = None
    ):
        """Create a map view"""
        from ..views.map_view import MapView
        return MapView(view_id, title, process_id)

    def create_notification(
        self, user_id: str, title: str, body: str, link: Optional[str] = None
    ):
        """Create a notification for a specific user"""
        from .notification import Notification
        return Notification(user_id, title, body, link)

    def sign_notification(self, notification: "Notification") -> SecureNotificationResponse:
        """Sign a notification with Ed25519"""
        notification_json = notification.to_json()
        timestamp = int(time.time() * 1000)  # milliseconds
        # Serialize notification payload properly (dataclass to dict)
        notification_dict = {
            "userId": notification_json.user_id,
            "message": {
                "title": notification_json.message.title,
                "body": notification_json.message.body,
                "link": notification_json.message.link,
            }
        }
        # Payload must match backend reconstruction: { notification (object), timestamp, appId }
        payload = json.dumps(
            {
                "notification": notification_dict,
                "timestamp": timestamp,
                "appId": self.config.app_id,
            }
        )
        signature_bytes = self._private_key.sign(payload.encode())
        import base64

        signature = base64.b64encode(signature_bytes).decode()

        return SecureNotificationResponse(
            app_id=self.config.app_id,
            signature=signature,
            timestamp=timestamp,
            notification=notification_json,
        )

    def send_notification(
        self, notification: "Notification", platform_url: Optional[str] = None
    ) -> None:
        """Send a signed notification to the City-Mate platform"""
        import requests

        signed_notification = self.sign_notification(notification)
        url = platform_url or self.config.platform_url

        if not url:
            raise ConfigurationError(
                "Platform URL required for sending notifications. "
                "Set platform_url in YeriaAppConfig or pass it as parameter."
            )

        try:
            # Convert dataclass to dict for JSON serialization
            payload = {
                "appId": signed_notification.app_id,
                "signature": signed_notification.signature,
                "timestamp": signed_notification.timestamp,
                "notification": {
                    "userId": signed_notification.notification.user_id,
                    "message": {
                        "title": signed_notification.notification.message.title,
                        "body": signed_notification.notification.message.body,
                        "link": signed_notification.notification.message.link,
                    },
                },
            }

            response = requests.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=self.config.notification_timeout,
            )

            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise ExternalError(f"Failed to send notification: {str(e)}")

    def rotate_key(
        self,
        yeria_api_base_url: str,
        service_id,
        new_keys: Dict[str, str],
    ) -> Dict[str, Any]:
        """Rotate the service's signing key on the Yeria registry.

        The rotation envelope is signed with the *current* private key — the
        caller proves they own the still-valid keypair before the new one is
        accepted. After this call succeeds:

        * The new public key becomes Active on Yeria.
        * The old key keeps validating signatures for ~5 minutes (grace
          window so in-flight signed responses still verify).
        * This YeriaApp instance is mutated to use the new keypair locally.

        :param yeria_api_base_url: Yeria registry root, e.g. ``https://yeria.app``.
        :param service_id: The service id assigned by Yeria.
        :param new_keys: ``{"privateKey": <PEM>, "publicKey": <PEM>}``.
        :returns: ``{"key_id", "expires_at", "grace_period_minutes"}``.
        """
        import base64
        import requests

        priv = new_keys.get("privateKey") or new_keys.get("private_key")
        pub = new_keys.get("publicKey") or new_keys.get("public_key")
        if not priv or not pub:
            raise ConfigurationError(
                "rotate_key requires both privateKey and publicKey in PEM format"
            )

        envelope = {
            "serviceId": str(service_id),
            "newPublicKey": pub,
            "timestamp": int(time.time() * 1000),
        }
        payload = json.dumps(envelope)
        signature = base64.b64encode(self._private_key.sign(payload.encode())).decode()

        url = f"{yeria_api_base_url.rstrip('/')}/api/v1/services/{service_id}/keys/rotate"
        try:
            response = requests.post(
                url,
                json={
                    "envelope": envelope,
                    "signature": signature,
                    "currentPublicKey": self.get_public_key(),
                },
                headers={"Content-Type": "application/json"},
                timeout=self.config.notification_timeout,
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise ExternalError(f"Key rotation request failed: {str(e)}")

        body = response.json() or {}
        data = body.get("data") or {}
        key = data.get("key") or {}

        # Locally swap to the new keypair so subsequent serve() calls sign
        # with it. Old responses still verify against the old public key
        # during the grace window because Yeria keeps both rows Active.
        self._private_key = self._load_private_key(priv)
        self._public_key = self._load_public_key(pub)

        return {
            "key_id": key.get("id"),
            "expires_at": key.get("expires_at"),
            "grace_period_minutes": data.get("grace_period_minutes", 5),
        }

    def verify_integrity(self, envelope: SignedEnvelope) -> bool:
        """Verify integrity of a signed envelope received off the wire.

        :raises AppIdMismatchError:        if appId doesn't match this.config.app_id
        :raises ViewExpiredError:          if timestamp > view_expiration_minutes
        :raises SignatureVerificationError: if signature invalid or payload malformed
        """
        import base64

        try:
            # 1. Verify signature on payload bytes
            try:
                self._public_key.verify(
                    base64.b64decode(envelope.signature),
                    envelope.payload.encode("utf-8"),
                )
            except Exception:
                raise SignatureVerificationError(self.config.app_id)

            # 2. Parse the now-trusted payload
            decoded = json.loads(envelope.payload)

            # 3. appId match
            if decoded.get("appId") != self.config.app_id:
                raise AppIdMismatchError(
                    self.config.app_id, decoded.get("appId", "")
                )

            # 4. Expiration window
            now = int(time.time() * 1000)
            expiration_time = self.config.view_expiration_minutes * 60 * 1000
            age = now - int(decoded.get("timestamp", 0))
            if age > expiration_time:
                view_id = (decoded.get("view") or {}).get("id", "unknown")
                raise ViewExpiredError(view_id, age, expiration_time)

            return True

        except (
            AppIdMismatchError,
            ViewExpiredError,
            SignatureVerificationError,
        ):
            raise
        except Exception as e:
            raise SignatureVerificationError(self.config.app_id) from e

    @staticmethod
    def verify_signature(
        public_key: str,
        payload: str,
        signature: str,
        on_error: Optional[Any] = None,
    ) -> bool:
        """Static signature verifier.

        :param public_key: PEM-encoded Ed25519 public key
        :param payload:    JSON string extracted from the envelope
        :param signature:  base64
        """
        import base64

        try:
            public_key_obj = serialization.load_pem_public_key(
                public_key.encode(), backend=default_backend()
            )
            public_key_obj.verify(
                base64.b64decode(signature), payload.encode("utf-8")
            )
            return True
        except Exception as error:
            if on_error:
                on_error(error)
            return False

    @staticmethod
    def sign_view(
        view: Dict[str, Any],
        app_id: str,
        private_key: str,
        timestamp: Optional[int] = None,
    ) -> SignedEnvelope:
        """Statically generate a signed envelope without YeriaApp instance."""
        import base64

        if timestamp is None:
            timestamp = int(time.time() * 1000)

        payload = json.dumps({"appId": app_id, "timestamp": timestamp, "view": view})
        private_key_obj = serialization.load_pem_private_key(
            private_key.encode(), password=None, backend=default_backend()
        )
        signature = private_key_obj.sign(payload.encode("utf-8"))
        return SignedEnvelope(
            payload=payload,
            signature=base64.b64encode(signature).decode(),
        )

    @staticmethod
    def verify_user_token(
        jwt_token: str,
        yeria_public_key: str,
        expected_service_id: Optional[Any] = None,
    ) -> UserTokenClaims:
        """Verify a Yeria-issued user token (RS256 JWT signed by Yeria's
        Registry RSA key). Used by providers to authenticate inbound
        requests carrying ``Authorization: Bearer <serviceToken>``.

        :param jwt_token:           Compact JWT string (``header.payload.signature``).
        :param yeria_public_key:    Yeria's Registry public key, PEM. Fetch
                                    once at boot from
                                    ``GET /api/v1/registry/public-key``.
        :param expected_service_id: When supplied, the function asserts
                                    ``aud == str(expected_service_id)``.
                                    Pass the service id your backend hosts;
                                    refuse tokens scoped to a different one.
        :returns: ``UserTokenClaims`` populated from the verified payload.
        :raises SignatureVerificationError: signature invalid / token
            malformed / wrong issuer / wrong audience / non-RS256 alg.
        :raises ViewExpiredError: ``exp`` claim is in the past.
        """
        import base64

        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.primitives.hashes import SHA256

        if not isinstance(jwt_token, str) or not jwt_token:
            raise SignatureVerificationError("yeria", "missing jwt")

        parts = jwt_token.split(".")
        if len(parts) != 3 or not all(parts):
            raise SignatureVerificationError("yeria", "malformed jwt")

        header_b64, payload_b64, signature_b64 = parts

        try:
            header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
            claims_raw = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        except Exception:
            raise SignatureVerificationError("yeria", "invalid base64 / json")

        if header.get("alg") != "RS256":
            raise SignatureVerificationError(
                "yeria", f"unsupported alg: {header.get('alg')!r}"
            )

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        signature_bytes = _b64url_decode(signature_b64)

        public_key_obj = serialization.load_pem_public_key(
            yeria_public_key.encode(), backend=default_backend()
        )
        try:
            public_key_obj.verify(
                signature_bytes, signing_input, padding.PKCS1v15(), SHA256()
            )
        except Exception:
            raise SignatureVerificationError("yeria", "signature mismatch")

        if claims_raw.get("iss") != "yeria":
            raise SignatureVerificationError(
                "yeria", f"unexpected issuer: {claims_raw.get('iss')!r}"
            )
        if expected_service_id is not None and claims_raw.get("aud") != str(expected_service_id):
            raise SignatureVerificationError(
                "yeria",
                f"audience mismatch: token aud={claims_raw.get('aud')!r}, expected={str(expected_service_id)!r}",
            )

        now_sec = int(time.time())
        exp = claims_raw.get("exp")
        if not isinstance(exp, int) or exp <= now_sec:
            raise ViewExpiredError("user-token", (now_sec - (exp or 0)) * 1000, 0)

        return UserTokenClaims(
            sub=str(claims_raw.get("sub", "")),
            aud=str(claims_raw.get("aud", "")),
            iss=str(claims_raw.get("iss", "")),
            exp=int(exp),
            iat=int(claims_raw["iat"]) if "iat" in claims_raw else None,
            kid=str(header["kid"]) if isinstance(header.get("kid"), str) else None,
        )

    @staticmethod
    def verify_user_token_with_resolver(
        jwt_token: str,
        resolver: PublicKeyResolver,
        expected_service_id: Optional[Any] = None,
    ) -> UserTokenClaims:
        """Same RS256 verify as :meth:`verify_user_token`, but the second
        argument is a ``kid -> PEM | None`` resolver instead of a fixed
        PEM. The SDK pulls ``kid`` from the JWT header, calls
        ``resolver(kid)``, and verifies the signature against whatever
        PEM comes back.

        Pair with :class:`YeriaKeyStore` so providers don't write key
        fetching, caching or rotation-grace handling themselves.

        :raises SignatureVerificationError: resolver returned ``None``,
            signature failed, issuer / audience mismatched, or the JWT
            is malformed.
        :raises ViewExpiredError: ``exp`` is in the past.
        """
        if not isinstance(jwt_token, str) or not jwt_token:
            raise SignatureVerificationError("yeria", "missing jwt")

        parts = jwt_token.split(".")
        if len(parts) != 3 or not all(parts):
            raise SignatureVerificationError("yeria", "malformed jwt")

        try:
            header = json.loads(_b64url_decode(parts[0]).decode("utf-8"))
        except Exception:
            raise SignatureVerificationError("yeria", "invalid header")

        kid = header.get("kid")
        if not isinstance(kid, str) or not kid:
            raise SignatureVerificationError("yeria", "jwt header missing kid")

        pem = resolver(kid)
        if not pem:
            # Resolver returns None when Yeria says the key is expired or
            # the kid is unknown. Either way the token cannot be trusted.
            raise SignatureVerificationError("yeria", f"no trusted key for kid={kid}")

        return YeriaApp.verify_user_token(jwt_token, pem, expected_service_id)

    @staticmethod
    def fetch_user_profile(
        *,
        base_url: str,
        service_id: Any,
        user_id: Any,
        private_key: str,
        timeout: int = 5,
    ) -> UserProfile:
        """Provider-side helper: fetch a Yeria user's profile by ``sub``.

        Builds an Ed25519-signed envelope and POSTs to
        ``POST /api/v1/provider/services/{service_id}/users/{user_id}/profile``.
        Yeria already holds every Active public key for this service, so
        the envelope itself is the only credential — no user JWT is sent
        in the body and the PEM is never disclosed.

        :param base_url:    Yeria platform URL (e.g. ``https://yeria.app``).
        :param service_id:  This provider's service id (must match the
                            ``aud`` of the user token you just verified).
        :param user_id:     Yeria ``sub`` of the user to fetch.
        :param private_key: Provider's Ed25519 private key in PEM format
                            (same key used to sign view envelopes).
        :param timeout:     HTTP timeout in seconds.
        :returns: :class:`UserProfile` projection.
        :raises ExternalError: on HTTP failure or unexpected response shape.
        """
        import base64
        import os
        import requests

        if not base_url:
            raise ConfigurationError("fetch_user_profile: base_url is required", parameter="base_url")
        if service_id is None:
            raise ConfigurationError("fetch_user_profile: service_id is required", parameter="service_id")
        if user_id is None:
            raise ConfigurationError("fetch_user_profile: user_id is required", parameter="user_id")
        if not isinstance(private_key, str) or not private_key:
            raise ConfigurationError("fetch_user_profile: private_key (PEM) is required", parameter="private_key")

        priv_obj = serialization.load_pem_private_key(
            private_key.encode(), password=None, backend=default_backend()
        )
        if not isinstance(priv_obj, Ed25519PrivateKey):
            raise ConfigurationError(
                "fetch_user_profile: private_key must be Ed25519 PEM",
                parameter="private_key",
            )

        envelope = {
            "service_id": service_id,
            "user_id": user_id,
            "timestamp": int(time.time() * 1000),
            "nonce": base64.b16encode(os.urandom(16)).decode().lower(),
        }
        payload_str = json.dumps(envelope, separators=(",", ":"), sort_keys=False)
        # Match the JS side: JSON.stringify in JS produces no whitespace
        # by default and preserves insertion order. Python's json.dumps
        # with the same separators and sort_keys=False matches.
        signature = base64.b64encode(priv_obj.sign(payload_str.encode("utf-8"))).decode()

        url = (
            base_url.rstrip("/")
            + f"/api/v1/provider/services/{service_id}/users/{user_id}/profile"
        )
        body = {"envelope": envelope, "signature": signature}
        try:
            res = requests.post(url, json=body, timeout=timeout)
        except requests.RequestException as e:
            raise RuntimeError(f"Yeria profile fetch transport error: {e}")

        try:
            data = res.json()
        except ValueError:
            data = None

        if res.status_code != 200:
            msg = _extract_error_message(data) or f"HTTP {res.status_code}"
            raise RuntimeError(f"Yeria profile fetch failed: {msg}")

        result = data.get("result", data) if isinstance(data, dict) else None
        if not isinstance(result, dict):
            raise RuntimeError("Yeria profile fetch: unexpected response shape")

        return UserProfile(
            user_id=int(result["user_id"]),
            first_name=result.get("first_name"),
            last_name=result.get("last_name"),
            country_code=result.get("country_code"),
        )


def _extract_error_message(body: Any) -> Optional[str]:
    if not isinstance(body, dict):
        return None
    if isinstance(body.get("message"), str):
        return body["message"]
    err = body.get("error")
    if isinstance(err, dict) and isinstance(err.get("message"), str):
        return err["message"]
    if isinstance(err, str):
        return err
    return None


# ── base64url helper (stateless, no extra dep) ────────────────────────────
def _b64url_decode(s: str) -> bytes:
    """JWT base64url decode (RFC 4648 §5). Adds padding as needed."""
    import base64

    padded = s + "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))

