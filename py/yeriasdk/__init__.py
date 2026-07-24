"""
Yeria SDK for Python
A stateless backend library for building views that are sent to renderers (mobile or web)
"""

# ── Public surface: two symbols ──────────────────────────────────────────
# `app`     — the secret-holding half: sign / verify / notify / rotate.
# `YeriaUI` — the keyless view factory: YeriaUI.create_form_view(...), etc.
from .core.yeria_app import YeriaApp, YeriaAppConfig
from .core.yeria_ui import YeriaUI
from .core.yeria_link import YeriaLink, YeriaLinkFormat
# Protocol types
from .core.yeria_protocol import (
    SignedEnvelope,
    DecodedPayload,
    YeriaTokenClaims,
    UserDetails,
    YeriaPublicKey,
    PublicKeyResolver,
)
# NOTE: the signer, envelope verifier, user-token verifier, Yeria HTTP client
# (YeriaPlatform), and the kid key cache (YeriaPublicKeys) are INTERNAL — all
# reachable through `app`. They are intentionally not exported.
from .core.base_view import BaseView
from .core.notification import Notification
from .views import (
    FormView,
    ReaderView,
    ActionListView,
    ActionGridView,
    IconGridView,
    QRScanView,
    QRDisplayView,
    MessageView,
    CardView,
    CarouselView,
    TimelineView,
    MediaView,
    MapView,
)
from .errors import (
    YeriaAppError,
    ValidationError,
    FieldValidationError,
    SecurityError,
    SignatureVerificationError,
    ViewExpiredError,
    AppIdMismatchError,
    ConfigurationError,
    MissingRequiredParameterError,
    InvalidParameterError,
    DataError,
    FieldNotFoundError,
    ActionNotFoundError,
    ElementNotFoundError,
    EmptyCollectionError,
    ViewError,
    ViewNotFoundError,
    ViewValidationError,
    MaxViewsExceededError,
    ExternalError,
    YeriaPlatformUnreachableError,
    MarkdownParseError,
    NoProcessContextError,
    ERROR_CODES,
)

__version__ = "1.3.0"

__all__ = [
    # Public surface: two symbols
    "YeriaApp",
    "YeriaAppConfig",
    "YeriaUI",
    "YeriaLink",
    "YeriaLinkFormat",
    # Protocol types
    "SignedEnvelope",
    "DecodedPayload",
    "YeriaTokenClaims",
    "UserDetails",
    "YeriaPublicKey",
    "PublicKeyResolver",
    "BaseView",
    "Notification",
    # View classes
    "FormView",
    "ReaderView",
    "ActionListView",
    "ActionGridView",
    "IconGridView",
    "QRScanView",
    "QRDisplayView",
    "MessageView",
    "CardView",
    "CarouselView",
    "TimelineView",
    "MediaView",
    "MapView",
    # Error classes
    "YeriaAppError",
    "ValidationError",
    "FieldValidationError",
    "SecurityError",
    "SignatureVerificationError",
    "ViewExpiredError",
    "AppIdMismatchError",
    "ConfigurationError",
    "MissingRequiredParameterError",
    "InvalidParameterError",
    "DataError",
    "FieldNotFoundError",
    "ActionNotFoundError",
    "ElementNotFoundError",
    "EmptyCollectionError",
    "ViewError",
    "ViewNotFoundError",
    "ViewValidationError",
    "MaxViewsExceededError",
    "ExternalError",
    "YeriaPlatformUnreachableError",
    "MarkdownParseError",
    "NoProcessContextError",
    "ERROR_CODES",
]
