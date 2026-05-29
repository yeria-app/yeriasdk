// Core views
export { FormView } from './core/form-view';
export { ReaderView } from './core/reader-view';
export { ActionListView } from './core/action-list-view';
export { ActionGridView } from './core/action-grid-view';
export { QRScanView } from './core/qr-scan-view';
export { QRDisplayView } from './core/qr-display-view';
export { MessageView } from './core/message-view';
export { CardView } from './core/card-view';
export { CarouselView } from './core/carousel-view';
export { TimelineView } from './core/timeline-view';
export { MediaView } from './core/media-view';
export { MapView } from './core/map-view';

// Secure YeriaApp
export { YeriaApp } from './core/yeria-app';
export type {
    YeriaAppConfig,
    SignedEnvelope,
    DecodedPayload,
    UserTokenClaims,
    UserProfile,
    YeriaPublicKeyResolver,
} from './core/yeria-app';

// Provider-side helper: resolves Yeria-issued JWT `kid` headers against
// the public-key endpoint with TTL + negative caching.
export { YeriaKeyStore } from './core/key-store';
export type { YeriaKeyStoreOptions, KeyState, KeyLookup } from './core/key-store';

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
