/**
 * Custom error types for Yeria SDK
 * Provides structured, type-safe error handling
 */

/**
 * Error codes for programmatic error handling
 */
export const ERROR_CODES = {
    // Validation errors (1xxx)
    VALIDATION_FAILED: 'JSON_1001',
    FIELD_REQUIRED: 'JSON_1002',
    INVALID_FORMAT: 'JSON_1003',
    INVALID_PARAMETER: 'JSON_1004',
    INVALID_RANGE: 'JSON_1005',
    FIELD_VALIDATION_FAILED: 'JSON_1006',

    // View errors (2xxx)
    VIEW_NOT_FOUND: 'JSON_2001',
    VIEW_INVALID: 'JSON_2002',
    MAX_VIEWS_EXCEEDED: 'JSON_2003',
    VIEW_NOT_REGISTERED: 'JSON_2004',

    // Security errors (3xxx)
    SIGNATURE_INVALID: 'JSON_3001',
    VIEW_EXPIRED: 'JSON_3002',
    APPID_MISMATCH: 'JSON_3003',
    CRYPTO_ERROR: 'JSON_3004',

    // Data errors (4xxx)
    FIELD_NOT_FOUND: 'JSON_4001',
    ACTION_NOT_FOUND: 'JSON_4002',
    ELEMENT_NOT_FOUND: 'JSON_4003',
    INVALID_INPUT: 'JSON_4004',
    EMPTY_COLLECTION: 'JSON_4005',

    // Configuration errors (5xxx)
    MISSING_REQUIRED_PARAM: 'JSON_5001',
    INVALID_CONFIG: 'JSON_5002',
    NO_PROCESS_CONTEXT: 'JSON_5003',

    // Map-specific errors (7xxx)
    LAYER_NOT_FOUND: 'JSON_7001',
    LAYER_TYPE_MISMATCH: 'JSON_7002',
    DUPLICATE_LAYER_ID: 'JSON_7003',
    INVALID_GEOPOINT: 'JSON_7004',
    INVALID_VIEWPORT: 'JSON_7005',

    // External library errors (6xxx)
    MARKDOWN_PARSE_ERROR: 'JSON_6001',
    URL_PARSE_ERROR: 'JSON_6002',
    FILE_FORMAT_ERROR: 'JSON_6003',
    NOTIFICATION_FAILED: 'JSON_6004',
    PLATFORM_UNREACHABLE: 'JSON_6005'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Base error class for all Yeria errors
 */
export class YeriaAppError extends Error {
    public readonly code: ErrorCode;
    public readonly details?: Record<string, unknown>;
    public readonly timestamp: Date;

    constructor(
        code: ErrorCode,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'YeriaAppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Returns a JSON representation of the error
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Validation errors - for field and form validation failures
 */
export class ValidationError extends YeriaAppError {
    constructor(
        message: string,
        public readonly field?: string,
        public readonly validationErrors?: string[]
    ) {
        super(
            ERROR_CODES.VALIDATION_FAILED,
            message,
            { field, validationErrors }
        );
        this.name = 'ValidationError';
    }
}

/**
 * Field validation error - specific field failed validation
 */
export class FieldValidationError extends YeriaAppError {
    constructor(
        public readonly fieldId: string,
        public readonly fieldType: string,
        public readonly validationErrors: string[]
    ) {
        super(
            ERROR_CODES.FIELD_VALIDATION_FAILED,
            `Field '${fieldId}' validation failed: ${validationErrors.join(', ')}`,
            { fieldId, fieldType, validationErrors }
        );
        this.name = 'FieldValidationError';
    }
}

/**
 * Security errors - signature verification, expiration, etc.
 */
export class SecurityError extends YeriaAppError {
    constructor(
        code: ErrorCode,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
        this.name = 'SecurityError';
    }
}

/**
 * Signature verification failed
 */
export class SignatureVerificationError extends SecurityError {
    constructor(
        public readonly appId: string,
        public readonly viewId?: string
    ) {
        super(
            ERROR_CODES.SIGNATURE_INVALID,
            'Signature verification failed',
            { appId, viewId }
        );
        this.name = 'SignatureVerificationError';
    }
}

/**
 * View has expired
 */
export class ViewExpiredError extends SecurityError {
    constructor(
        public readonly viewId: string,
        public readonly age: number,
        public readonly maxAge: number
    ) {
        super(
            ERROR_CODES.VIEW_EXPIRED,
            `View expired (age: ${age}ms, max: ${maxAge}ms)`,
            { viewId, age, maxAge }
        );
        this.name = 'ViewExpiredError';
    }
}

/**
 * AppId mismatch
 */
export class AppIdMismatchError extends SecurityError {
    constructor(
        public readonly expected: string,
        public readonly received: string
    ) {
        super(
            ERROR_CODES.APPID_MISMATCH,
            `AppId mismatch: expected '${expected}', received '${received}'`,
            { expected, received }
        );
        this.name = 'AppIdMismatchError';
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends YeriaAppError {
    constructor(
        message: string,
        public readonly parameter?: string,
        details?: Record<string, unknown>
    ) {
        super(ERROR_CODES.INVALID_CONFIG, message, { parameter, ...details });
        this.name = 'ConfigurationError';
    }
}

/**
 * Missing required parameter
 */
export class MissingRequiredParameterError extends YeriaAppError {
    constructor(public readonly parameterName: string) {
        super(
            ERROR_CODES.MISSING_REQUIRED_PARAM,
            `Required parameter '${parameterName}' is missing`,
            { parameterName }
        );
        this.name = 'MissingRequiredParameterError';
    }
}

/**
 * Invalid parameter value
 */
export class InvalidParameterError extends YeriaAppError {
    constructor(
        public readonly parameterName: string,
        public readonly value: unknown,
        public readonly constraint: string
    ) {
        super(
            ERROR_CODES.INVALID_PARAMETER,
            `Invalid parameter '${parameterName}': ${constraint}`,
            { parameterName, value, constraint }
        );
        this.name = 'InvalidParameterError';
    }
}

/**
 * Data errors - field not found, invalid data, etc.
 */
export class DataError extends YeriaAppError {
    constructor(
        code: ErrorCode,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
        this.name = 'DataError';
    }
}

/**
 * Field not found in form
 */
export class FieldNotFoundError extends DataError {
    constructor(
        public readonly fieldId: string,
        public readonly formId: string
    ) {
        super(
            ERROR_CODES.FIELD_NOT_FOUND,
            `Field '${fieldId}' not found in form '${formId}'`,
            { fieldId, formId }
        );
        this.name = 'FieldNotFoundError';
    }
}

/**
 * Action not found in action view
 */
export class ActionNotFoundError extends DataError {
    constructor(
        public readonly actionCode: string,
        public readonly viewId: string
    ) {
        super(
            ERROR_CODES.ACTION_NOT_FOUND,
            `Action '${actionCode}' not found in view '${viewId}'`,
            { actionCode, viewId }
        );
        this.name = 'ActionNotFoundError';
    }
}

/**
 * Element not found in view
 */
export class ElementNotFoundError extends DataError {
    constructor(
        public readonly index: number,
        public readonly viewId: string
    ) {
        super(
            ERROR_CODES.ELEMENT_NOT_FOUND,
            `Element at index ${index} not found in view '${viewId}'`,
            { index, viewId }
        );
        this.name = 'ElementNotFoundError';
    }
}

/**
 * Empty collection error
 */
export class EmptyCollectionError extends DataError {
    constructor(
        public readonly collectionName: string,
        public readonly constraint: string
    ) {
        super(
            ERROR_CODES.EMPTY_COLLECTION,
            `${collectionName} cannot be empty: ${constraint}`,
            { collectionName, constraint }
        );
        this.name = 'EmptyCollectionError';
    }
}

/**
 * View errors
 */
export class ViewError extends YeriaAppError {
    constructor(
        code: ErrorCode,
        message: string,
        public readonly viewId: string,
        details?: Record<string, unknown>
    ) {
        super(code, message, { viewId, ...details });
        this.name = 'ViewError';
    }
}

/**
 * View not found
 */
export class ViewNotFoundError extends ViewError {
    constructor(
        viewId: string,
        public readonly appId: string
    ) {
        super(
            ERROR_CODES.VIEW_NOT_FOUND,
            `View '${viewId}' not found in app '${appId}'`,
            viewId,
            { appId }
        );
        this.name = 'ViewNotFoundError';
    }
}

/**
 * View validation failed
 */
export class ViewValidationError extends ViewError {
    constructor(
        viewId: string,
        public readonly viewType: string,
        public readonly errors: string[]
    ) {
        super(
            ERROR_CODES.VIEW_INVALID,
            `View validation failed: ${errors.join(', ')}`,
            viewId,
            { viewType, errors }
        );
        this.name = 'ViewValidationError';
    }
}

/**
 * Maximum views exceeded
 */
export class MaxViewsExceededError extends ViewError {
    constructor(
        public readonly limit: number,
        public readonly current: number,
        public readonly appId: string
    ) {
        super(
            ERROR_CODES.MAX_VIEWS_EXCEEDED,
            `Maximum number of views (${limit}) exceeded. Current: ${current}.`,
            'N/A',
            { limit, current, appId }
        );
        this.name = 'MaxViewsExceededError';
    }
}

/**
 * External library errors
 */
export class ExternalError extends YeriaAppError {
    constructor(
        code: ErrorCode,
        message: string,
        public readonly library: string,
        public readonly cause?: Error
    ) {
        super(code, message, { library, cause: cause?.message });
        this.name = 'ExternalError';

        // Preserve original stack if available
        if (cause?.stack) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }
}

/**
 * Yeria platform unreachable — the SDK could not reach the Yeria platform
 * to resolve a signing key (`kid`). This is a TRANSPORT failure (network
 * down, timeout, 5xx, or a non-JSON error page such as a gateway 503),
 * NOT a statement about the key itself.
 *
 * Deliberately distinct from a key being expired/unknown: those mean the
 * inbound token must be rejected (401). This means the SDK could not make
 * a trust decision at all — the caller should surface a 503 and let the
 * client retry, never a 401. The name says "Yeria platform" (not the local
 * key store) so it is unambiguous which side is down.
 */
export class YeriaPlatformUnreachableError extends YeriaAppError {
    constructor(
        public readonly kid: string,
        public readonly url: string,
        public readonly reason: 'network' | 'http_error' | 'malformed_response',
        public readonly statusCode?: number,
        public readonly cause?: Error,
    ) {
        super(
            ERROR_CODES.PLATFORM_UNREACHABLE,
            `Yeria platform unreachable while resolving key '${kid}' `
                + `(${reason}${statusCode ? ` HTTP ${statusCode}` : ''}). `
                + `Could not verify the token — this is a transport failure `
                + `reaching Yeria, not a rejection of the key.`,
            { kid, url, reason, statusCode, cause: cause?.message },
        );
        this.name = 'YeriaPlatformUnreachableError';
        if (cause?.stack) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }
}

/**
 * Markdown parsing error
 */
export class MarkdownParseError extends YeriaAppError {
    constructor(
        public readonly viewId: string,
        public readonly cause?: Error
    ) {
        super(
            ERROR_CODES.MARKDOWN_PARSE_ERROR,
            'Failed to parse markdown content',
            {
                viewId,
                library: 'marked',
                cause: cause?.message
            }
        );
        this.name = 'MarkdownParseError';

        // Preserve original stack if available
        if (cause?.stack) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }
}

/**
 * No process context error
 */
export class NoProcessContextError extends YeriaAppError {
    constructor(
        public readonly viewId: string,
        public readonly operation: string
    ) {
        super(
            ERROR_CODES.NO_PROCESS_CONTEXT,
            `No process context to ${operation}. Call setProcess() first.`,
            { viewId, operation }
        );
        this.name = 'NoProcessContextError';
    }
}

/**
 * Map-specific errors
 */
export class LayerNotFoundError extends YeriaAppError {
    constructor(public readonly layerId: string) {
        super(
            ERROR_CODES.LAYER_NOT_FOUND,
            `Map layer "${layerId}" not found. Create it via addLayer({...}) before targeting it.`,
            { layerId }
        );
        this.name = 'LayerNotFoundError';
    }
}

export class LayerTypeMismatchError extends YeriaAppError {
    constructor(
        public readonly layerId: string,
        public readonly expected: string,
        public readonly actual: string
    ) {
        super(
            ERROR_CODES.LAYER_TYPE_MISMATCH,
            `Map layer "${layerId}" has type "${actual}", cannot accept ${expected} content.`,
            { layerId, expected, actual }
        );
        this.name = 'LayerTypeMismatchError';
    }
}

export class DuplicateLayerIdError extends YeriaAppError {
    constructor(public readonly layerId: string) {
        super(
            ERROR_CODES.DUPLICATE_LAYER_ID,
            `Map layer id "${layerId}" already exists. Layer ids must be unique within a MapView.`,
            { layerId }
        );
        this.name = 'DuplicateLayerIdError';
    }
}

export class InvalidGeoPointError extends YeriaAppError {
    constructor(public readonly point: unknown, public readonly reason: string) {
        super(
            ERROR_CODES.INVALID_GEOPOINT,
            `Invalid GeoPoint: ${reason}`,
            { point, reason }
        );
        this.name = 'InvalidGeoPointError';
    }
}

export class InvalidViewportError extends YeriaAppError {
    constructor(public readonly reason: string) {
        super(
            ERROR_CODES.INVALID_VIEWPORT,
            `Invalid map viewport: ${reason}`,
            { reason }
        );
        this.name = 'InvalidViewportError';
    }
}

/**
 * Result type for operations that may fail
 * Better than boolean - provides error context
 */
export type Result<T, E = string> =
    | { ok: true; value: T }
    | { ok: false; error: E };

/**
 * Helper to create success result
 */
export function Ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
}

/**
 * Helper to create error result
 */
export function Err<E>(error: E): Result<never, E> {
    return { ok: false, error };
}

/**
 * Type guard for error checking
 */
export function isYeriaAppError(error: unknown): error is YeriaAppError {
    return error instanceof YeriaAppError;
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error';
}

/**
 * Extract error code safely
 */
export function getErrorCode(error: unknown): string | undefined {
    if (isYeriaAppError(error)) {
        return error.code;
    }
    return undefined;
}

