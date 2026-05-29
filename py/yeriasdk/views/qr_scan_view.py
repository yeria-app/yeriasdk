"""
QRScanView - A view for scanning QR codes
"""

from typing import Optional, Literal
from datetime import datetime

from ..core.base_view import BaseView
from ..types.models import QRScanContent, QRScanValidation, QRScanPreview, SubmitAction
from ..errors.exceptions import InvalidParameterError


class QRScanView(BaseView):
    """View for scanning QR codes"""

    def __init__(self, view_id: str, title: str, process_id: Optional[str] = None):
        super().__init__(
            {
                "id": view_id,
                "type": "QRScan",
                "process_id": process_id,
                "metadata": {
                    "version": "2.0.0",
                    "created_at": datetime.now(),
                },
            }
        )

        self.content: QRScanContent = {
            "title": title,
            "intro": "",
            "autoSubmit": True,  # Auto-submit by default
        }

    def set_intro(self, intro: str) -> "QRScanView":
        """Set instructional text shown to the user"""
        return self._set_intro_text("intro", intro)

    def submit_button(
        self, text: str, confirm_message: Optional[str] = None
    ) -> "QRScanView":
        """Configure submit button for manual confirmation"""
        if not text or not text.strip():
            raise InvalidParameterError("text", text, "Button text cannot be empty")

        self.content["submit"] = {
            "text": text.strip(),
            "method": "POST",
            "confirmMessage": confirm_message,
        }

        # Disable auto-submit when button is present
        self.content["autoSubmit"] = False
        return self

    def set_validation(
        self,
        error_message: str,
        format: Optional[Literal["text", "number", "url", "email"]] = None,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        starts_with: Optional[str] = None,
    ) -> "QRScanView":
        """Set simple validation rules for scanned data"""
        if not error_message or not error_message.strip():
            raise InvalidParameterError(
                "errorMessage", error_message, "Error message is required for validation"
            )

        validation: QRScanValidation = {
            "errorMessage": error_message.strip(),
        }

        if format is not None:
            valid_formats = ["text", "number", "url", "email"]
            if format not in valid_formats:
                raise InvalidParameterError(
                    "format", format, f"Format must be one of: {', '.join(valid_formats)}"
                )
            validation["format"] = format

        if starts_with is not None:
            trimmed = starts_with.strip()
            if not trimmed:
                raise InvalidParameterError(
                    "startsWith", starts_with, "startsWith cannot be empty"
                )
            validation["startsWith"] = trimmed

        if min_length is not None:
            if min_length < 0:
                raise InvalidParameterError(
                    "minLength", min_length, "minLength must be >= 0"
                )
            validation["minLength"] = min_length

        if max_length is not None:
            if max_length < 1:
                raise InvalidParameterError(
                    "maxLength", max_length, "maxLength must be >= 1"
                )
            if min_length is not None and max_length < min_length:
                raise InvalidParameterError(
                    "maxLength", max_length, "maxLength must be >= minLength"
                )
            validation["maxLength"] = max_length

        self.content["validation"] = validation
        return self

    def enable_preview(
        self, editable: bool = False, label: Optional[str] = None
    ) -> "QRScanView":
        """Enable preview mode where scanned value is shown before submission"""
        self.content["preview"] = {
            "enabled": True,
            "editable": editable,
            "label": label.strip() if label else "Scanned Code",
        }
        return self

    def disable_preview(self) -> "QRScanView":
        """Disable preview mode"""
        self.content["preview"] = None
        return self

    def set_auto_submit(self, enabled: bool = True) -> "QRScanView":
        """Explicitly enable or disable auto-submit"""
        self.content["autoSubmit"] = enabled
        return self

    def _validate(self):
        """Validate the view configuration"""
        from ..types.models import ValidationResult, create_validation_error

        base_result = super()._validate()
        errors = list(base_result.errors)

        content = self.content
        # Preview requires submit button
        if content.get("preview", {}).get("enabled") and not content.get("submit"):
            errors.append(
                create_validation_error("Preview mode requires a submit button")
            )

        # If preview is editable, submit button is required
        if content.get("preview", {}).get("editable") and not content.get("submit"):
            errors.append(
                create_validation_error("Editable preview requires a submit button")
            )

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=base_result.warnings,
        )

