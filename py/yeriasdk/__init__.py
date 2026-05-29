"""
Yeria SDK for Python
A stateless backend library for building views that are sent to renderers (mobile or web)
"""

from .core.yeria_app import (
    YeriaApp,
    YeriaAppConfig,
    SignedEnvelope,
    UserTokenClaims,
    UserProfile,
    PublicKeyResolver,
)
from .core.key_store import YeriaKeyStore, KeyLookup
from .core.base_view import BaseView
from .core.notification import Notification
from .views import (
    FormView,
    ReaderView,
    ActionListView,
    ActionGridView,
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
    MarkdownParseError,
    NoProcessContextError,
    ERROR_CODES,
)

__version__ = "3.0.0"

__all__ = [
    # Core classes
    "YeriaApp",
    "YeriaAppConfig",
    "SignedEnvelope",
    "UserTokenClaims",
    "UserProfile",
    "PublicKeyResolver",
    "YeriaKeyStore",
    "KeyLookup",
    "BaseView",
    "Notification",
    # View classes
    "FormView",
    "ReaderView",
    "ActionListView",
    "ActionGridView",
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
    "MarkdownParseError",
    "NoProcessContextError",
    "ERROR_CODES",
]
