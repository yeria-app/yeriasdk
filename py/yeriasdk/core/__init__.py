"""Core classes for Yeria SDK"""

from .base_view import BaseView
from .yeria_app import YeriaApp, YeriaAppConfig
from .yeria_ui import YeriaUI
from .yeria_protocol import (
    SignedEnvelope,
    DecodedPayload,
    YeriaTokenClaims,
    UserDetails,
    YeriaPublicKey,
    PublicKeyResolver,
)

# NOTE: YeriaPlatform, the signer/verifiers, and the kid key cache
# (YeriaPublicKeys) are INTERNAL — all reachable through `app`. Not exported.

__all__ = [
    "BaseView",
    "YeriaApp",
    "YeriaAppConfig",
    "YeriaUI",
    "SignedEnvelope",
    "DecodedPayload",
    "YeriaTokenClaims",
    "UserDetails",
    "YeriaPublicKey",
    "PublicKeyResolver",
]
