// Core views
export { FormView } from './core/form-view';
export { ReaderView } from './core/reader-view';
export { ActionListView } from './core/action-list-view';
export { ActionGridView } from './core/action-grid-view';
export { IconGridView } from './core/icon-grid-view';
export { QRScanView } from './core/qr-scan-view';
export { QRDisplayView } from './core/qr-display-view';
export { MessageView } from './core/message-view';
export { CardView } from './core/card-view';
export { CarouselView } from './core/carousel-view';
export { TimelineView } from './core/timeline-view';
export { MediaView } from './core/media-view';
export { MapView } from './core/map-view';

// ── Public surface: two symbols ──────────────────────────────────────────
// `app` — the secret-holding half: sign / verify / notify / rotate. Construct
//         once as a process-wide singleton.
export { YeriaApp } from './core/yeria-app';
// `YeriaUI` — keyless view factory: `YeriaUI.createFormView(...)`, `fromJson`.
//         Import and use directly, no construction.
export { YeriaUI } from './core/yeria-ui';

export type {
    YeriaAppConfig,
} from './core/yeria-app';
export type {
    SignedEnvelope,
    DecodedPayload,
    YeriaTokenClaims,
    UserDetails,
    YeriaPublicKey,
    YeriaPublicKeyResolver,
} from './core/yeria-protocol';
// Provider → mobile error contract (YeriaUI.error / app.serveError).
export type {
    ProviderErrorSpec,
    ProviderFieldError,
    ProviderErrorObject,
    ProviderErrorBody,
} from './core/provider-error';

// NOTE: the signer, envelope verifier, user-token verifier, Yeria HTTP client
// (YeriaPlatform), and the kid key cache (YeriaPublicKeys) are INTERNAL — all
// reachable through `app`. They are intentionally not exported.

// Notifications
export { Notification } from './core/notification';
export type { NotificationMessage, NotificationPayload, SecureNotificationResponse } from './types';

// Base view
export { BaseView } from './core/base-view';

// Types
export * from './types';

// Utils
export { Logger } from './utils/logger'; // Legacy - deprecated
export { FieldValidator, FormValidator } from './utils/validators';
export { DataSanitizer } from './utils/validators';

// Utilities
export { FileFormatManager } from './utils/fileFormats';

// Errors
export {
    // Base error
    YeriaAppError,
    // Error codes
    ERROR_CODES,
    // Error types
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
    // Result type
    Result,
    Ok,
    Err,
    // Helpers
    isYeriaAppError,
    getErrorMessage,
    getErrorCode
} from './errors'; 
