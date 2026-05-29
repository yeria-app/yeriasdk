"""
Custom error types for Yeria SDK
Provides structured, type-safe error handling
"""

from typing import Optional, Dict, Any, Literal, Union
from dataclasses import dataclass
from datetime import datetime


# Error codes for programmatic error handling
ERROR_CODES = {
    # Validation errors (1xxx)
    "VALIDATION_FAILED": "JSON_1001",
    "FIELD_REQUIRED": "JSON_1002",
    "INVALID_FORMAT": "JSON_1003",
    "INVALID_PARAMETER": "JSON_1004",
    "INVALID_RANGE": "JSON_1005",
    "FIELD_VALIDATION_FAILED": "JSON_1006",
    # View errors (2xxx)
    "VIEW_NOT_FOUND": "JSON_2001",
    "VIEW_INVALID": "JSON_2002",
    "MAX_VIEWS_EXCEEDED": "JSON_2003",
    "VIEW_NOT_REGISTERED": "JSON_2004",
    # Security errors (3xxx)
    "SIGNATURE_INVALID": "JSON_3001",
    "VIEW_EXPIRED": "JSON_3002",
    "APPID_MISMATCH": "JSON_3003",
    "CRYPTO_ERROR": "JSON_3004",
    # Data errors (4xxx)
    "FIELD_NOT_FOUND": "JSON_4001",
    "ACTION_NOT_FOUND": "JSON_4002",
    "ELEMENT_NOT_FOUND": "JSON_4003",
    "INVALID_INPUT": "JSON_4004",
    "EMPTY_COLLECTION": "JSON_4005",
    # Configuration errors (5xxx)
    "MISSING_REQUIRED_PARAM": "JSON_5001",
    "INVALID_CONFIG": "JSON_5002",
    "NO_PROCESS_CONTEXT": "JSON_5003",
    # External library errors (6xxx)
    "MARKDOWN_PARSE_ERROR": "JSON_6001",
    "URL_PARSE_ERROR": "JSON_6002",
    "FILE_FORMAT_ERROR": "JSON_6003",
    # Map-specific errors (7xxx)
    "LAYER_NOT_FOUND": "JSON_7001",
    "LAYER_TYPE_MISMATCH": "JSON_7002",
    "DUPLICATE_LAYER_ID": "JSON_7003",
    "INVALID_GEOPOINT": "JSON_7004",
    "INVALID_VIEWPORT": "JSON_7005",
}

ErrorCode = str


class YeriaAppError(Exception):
    """Base error class for all Yeria errors"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.details = details or {}
        self.timestamp = datetime.now()
        self.name = "YeriaAppError"

    def to_json(self) -> Dict[str, Any]:
        """Returns a JSON representation of the error"""
        return {
            "name": self.name,
            "code": self.code,
            "message": str(self),
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
        }


class ValidationError(YeriaAppError):
    """Validation errors - for field and form validation failures"""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        validation_errors: Optional[list[str]] = None,
    ):
        super().__init__(
            ERROR_CODES["VALIDATION_FAILED"],
            message,
            {"field": field, "validationErrors": validation_errors or []},
        )
        self.name = "ValidationError"
        self.field = field
        self.validation_errors = validation_errors or []


class FieldValidationError(YeriaAppError):
    """Field validation error - specific field failed validation"""

    def __init__(
        self, field_id: str, field_type: str, validation_errors: list[str]
    ):
        super().__init__(
            ERROR_CODES["FIELD_VALIDATION_FAILED"],
            f"Field '{field_id}' validation failed: {', '.join(validation_errors)}",
            {
                "fieldId": field_id,
                "fieldType": field_type,
                "validationErrors": validation_errors,
            },
        )
        self.name = "FieldValidationError"
        self.field_id = field_id
        self.field_type = field_type
        self.validation_errors = validation_errors


class SecurityError(YeriaAppError):
    """Security errors - signature verification, expiration, etc."""

    def __init__(
        self, code: ErrorCode, message: str, details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(code, message, details)
        self.name = "SecurityError"


class SignatureVerificationError(SecurityError):
    """Signature verification failed"""

    def __init__(self, app_id: str, view_id: Optional[str] = None):
        super().__init__(
            ERROR_CODES["SIGNATURE_INVALID"],
            "Signature verification failed",
            {"appId": app_id, "viewId": view_id},
        )
        self.name = "SignatureVerificationError"
        self.app_id = app_id
        self.view_id = view_id


class ViewExpiredError(SecurityError):
    """View has expired"""

    def __init__(self, view_id: str, age: int, max_age: int):
        super().__init__(
            ERROR_CODES["VIEW_EXPIRED"],
            f"View expired (age: {age}ms, max: {max_age}ms)",
            {"viewId": view_id, "age": age, "maxAge": max_age},
        )
        self.name = "ViewExpiredError"
        self.view_id = view_id
        self.age = age
        self.max_age = max_age


class AppIdMismatchError(SecurityError):
    """AppId mismatch"""

    def __init__(self, expected: str, received: str):
        super().__init__(
            ERROR_CODES["APPID_MISMATCH"],
            f"AppId mismatch: expected '{expected}', received '{received}'",
            {"expected": expected, "received": received},
        )
        self.name = "AppIdMismatchError"
        self.expected = expected
        self.received = received


class ConfigurationError(YeriaAppError):
    """Configuration errors"""

    def __init__(
        self,
        message: str,
        parameter: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            ERROR_CODES["INVALID_CONFIG"],
            message,
            {**(details or {}), "parameter": parameter},
        )
        self.name = "ConfigurationError"
        self.parameter = parameter


class MissingRequiredParameterError(YeriaAppError):
    """Missing required parameter"""

    def __init__(self, parameter_name: str):
        super().__init__(
            ERROR_CODES["MISSING_REQUIRED_PARAM"],
            f"Required parameter '{parameter_name}' is missing",
            {"parameterName": parameter_name},
        )
        self.name = "MissingRequiredParameterError"
        self.parameter_name = parameter_name


class InvalidParameterError(YeriaAppError):
    """Invalid parameter value"""

    def __init__(self, parameter_name: str, value: Any, constraint: str):
        super().__init__(
            ERROR_CODES["INVALID_PARAMETER"],
            f"Invalid parameter '{parameter_name}': {constraint}",
            {"parameterName": parameter_name, "value": value, "constraint": constraint},
        )
        self.name = "InvalidParameterError"
        self.parameter_name = parameter_name
        self.value = value
        self.constraint = constraint


class DataError(YeriaAppError):
    """Data errors - field not found, invalid data, etc."""

    def __init__(
        self, code: ErrorCode, message: str, details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(code, message, details)
        self.name = "DataError"


class FieldNotFoundError(DataError):
    """Field not found in form"""

    def __init__(self, field_id: str, form_id: str):
        super().__init__(
            ERROR_CODES["FIELD_NOT_FOUND"],
            f"Field '{field_id}' not found in form '{form_id}'",
            {"fieldId": field_id, "formId": form_id},
        )
        self.name = "FieldNotFoundError"
        self.field_id = field_id
        self.form_id = form_id


class ActionNotFoundError(DataError):
    """Action not found in action view"""

    def __init__(self, action_code: str, view_id: str):
        super().__init__(
            ERROR_CODES["ACTION_NOT_FOUND"],
            f"Action '{action_code}' not found in view '{view_id}'",
            {"actionCode": action_code, "viewId": view_id},
        )
        self.name = "ActionNotFoundError"
        self.action_code = action_code
        self.view_id = view_id


class ElementNotFoundError(DataError):
    """Element not found in view"""

    def __init__(self, index: int, view_id: str):
        super().__init__(
            ERROR_CODES["ELEMENT_NOT_FOUND"],
            f"Element at index {index} not found in view '{view_id}'",
            {"index": index, "viewId": view_id},
        )
        self.name = "ElementNotFoundError"
        self.index = index
        self.view_id = view_id


class EmptyCollectionError(DataError):
    """Empty collection error"""

    def __init__(self, collection_name: str, constraint: str):
        super().__init__(
            ERROR_CODES["EMPTY_COLLECTION"],
            f"{collection_name} cannot be empty: {constraint}",
            {"collectionName": collection_name, "constraint": constraint},
        )
        self.name = "EmptyCollectionError"
        self.collection_name = collection_name
        self.constraint = constraint


class ViewError(YeriaAppError):
    """View errors"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        view_id: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(code, message, {**(details or {}), "viewId": view_id})
        self.name = "ViewError"
        self.view_id = view_id


class ViewNotFoundError(ViewError):
    """View not found"""

    def __init__(self, view_id: str, app_id: str):
        super().__init__(
            ERROR_CODES["VIEW_NOT_FOUND"],
            f"View '{view_id}' not found in app '{app_id}'",
            view_id,
            {"appId": app_id},
        )
        self.name = "ViewNotFoundError"
        self.app_id = app_id


class ViewValidationError(ViewError):
    """View validation failed"""

    def __init__(self, view_id: str, view_type: str, errors: list[str]):
        super().__init__(
            ERROR_CODES["VIEW_INVALID"],
            f"View validation failed: {', '.join(errors)}",
            view_id,
            {"viewType": view_type, "errors": errors},
        )
        self.name = "ViewValidationError"
        self.view_type = view_type
        self.errors = errors


class MaxViewsExceededError(ViewError):
    """Maximum views exceeded"""

    def __init__(self, limit: int, current: int, app_id: str):
        super().__init__(
            ERROR_CODES["MAX_VIEWS_EXCEEDED"],
            f"Maximum number of views ({limit}) exceeded. Current: {current}.",
            "N/A",
            {"limit": limit, "current": current, "appId": app_id},
        )
        self.name = "MaxViewsExceededError"
        self.limit = limit
        self.current = current
        self.app_id = app_id


class ExternalError(YeriaAppError):
    """External library errors"""

    def __init__(
        self, code: ErrorCode, message: str, library: str, cause: Optional[Exception] = None
    ):
        super().__init__(
            code,
            message,
            {"library": library, "cause": str(cause) if cause else None},
        )
        self.name = "ExternalError"
        self.library = library
        self.cause = cause


class MarkdownParseError(YeriaAppError):
    """Markdown parsing error"""

    def __init__(self, view_id: str, cause: Optional[Exception] = None):
        super().__init__(
            ERROR_CODES["MARKDOWN_PARSE_ERROR"],
            "Failed to parse markdown content",
            {
                "viewId": view_id,
                "library": "markdown",
                "cause": str(cause) if cause else None,
            },
        )
        self.name = "MarkdownParseError"
        self.view_id = view_id
        self.cause = cause


class NoProcessContextError(YeriaAppError):
    """No process context error"""

    def __init__(self, view_id: str, operation: str):
        super().__init__(
            ERROR_CODES["NO_PROCESS_CONTEXT"],
            f"No process context to {operation}. Call setProcess() first.",
            {"viewId": view_id, "operation": operation},
        )
        self.name = "NoProcessContextError"
        self.view_id = view_id
        self.operation = operation


# ─── Map-specific errors ───────────────────────────────────────────

class LayerNotFoundError(YeriaAppError):
    def __init__(self, layer_id: str):
        super().__init__(
            ERROR_CODES["LAYER_NOT_FOUND"],
            f'Map layer "{layer_id}" not found. Create it via add_layer({{...}}) before targeting it.',
            {"layerId": layer_id},
        )
        self.name = "LayerNotFoundError"
        self.layer_id = layer_id


class LayerTypeMismatchError(YeriaAppError):
    def __init__(self, layer_id: str, expected: str, actual: str):
        super().__init__(
            ERROR_CODES["LAYER_TYPE_MISMATCH"],
            f'Map layer "{layer_id}" has type "{actual}", cannot accept {expected} content.',
            {"layerId": layer_id, "expected": expected, "actual": actual},
        )
        self.name = "LayerTypeMismatchError"
        self.layer_id = layer_id
        self.expected = expected
        self.actual = actual


class DuplicateLayerIdError(YeriaAppError):
    def __init__(self, layer_id: str):
        super().__init__(
            ERROR_CODES["DUPLICATE_LAYER_ID"],
            f'Map layer id "{layer_id}" already exists. Layer ids must be unique within a MapView.',
            {"layerId": layer_id},
        )
        self.name = "DuplicateLayerIdError"
        self.layer_id = layer_id


class InvalidGeoPointError(YeriaAppError):
    def __init__(self, point: Any, reason: str):
        super().__init__(
            ERROR_CODES["INVALID_GEOPOINT"],
            f"Invalid GeoPoint: {reason}",
            {"point": point, "reason": reason},
        )
        self.name = "InvalidGeoPointError"
        self.point = point
        self.reason = reason


class InvalidViewportError(YeriaAppError):
    def __init__(self, reason: str):
        super().__init__(
            ERROR_CODES["INVALID_VIEWPORT"],
            f"Invalid map viewport: {reason}",
            {"reason": reason},
        )
        self.name = "InvalidViewportError"
        self.reason = reason


# Result type for operations that may fail
@dataclass
class Result:
    """Result type for operations that may fail"""

    ok: bool
    value: Optional[Any] = None
    error: Optional[Any] = None


def Ok(value: Any) -> Result:
    """Helper to create success result"""
    return Result(ok=True, value=value)


def Err(error: Any) -> Result:
    """Helper to create error result"""
    return Result(ok=False, error=error)


def is_yeria_app_error(error: Any) -> bool:
    """Type guard for error checking"""
    return isinstance(error, YeriaAppError)


def get_error_message(error: Any) -> str:
    """Extract error message safely"""
    if isinstance(error, Exception):
        return str(error)
    if isinstance(error, str):
        return error
    return "Unknown error"


def get_error_code(error: Any) -> Optional[str]:
    """Extract error code safely"""
    if is_yeria_app_error(error):
        return error.code
    return None

