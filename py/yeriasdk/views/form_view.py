"""
FormView - A view for displaying forms with various field types
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import re

from ..core.base_view import BaseView
from ..types.models import FormFieldParams, SubmitAction, FieldValidation, ValidationResult, HttpMethod
from ..utils.validators import FieldValidator, FormValidator
from ..errors.exceptions import (
    MissingRequiredParameterError,
    FieldValidationError,
    FieldNotFoundError,
    EmptyCollectionError,
)


class FormView(BaseView):
    """View for displaying forms with validation"""

    def __init__(self, form_id: str, title: str, process_id: Optional[str] = None):
        super().__init__(
            {
                "id": form_id,
                "type": "Form",
                "process_id": process_id,
                "metadata": {
                    "version": "1.0.0",
                    "created_at": datetime.now(),
                },
            }
        )

        self.content = {
            "title": title,
            "intro": "",
            "submit": None,
            "fields": [],
        }

        self._field_validations: Dict[str, FieldValidation] = {}

    def set_intro(self, intro: str) -> "FormView":
        """Set form introduction text"""
        return self._set_intro_text("intro", intro)

    def set_note(self, note: str) -> "FormView":
        """Set form note (deprecated - use set_intro() instead)"""
        return self.set_intro(note)

    def belongs_to_process(
        self,
        process_id: str,
        process_name: Optional[str] = None,
        current_step: Optional[int] = None,
        total_steps: Optional[int] = None,
        step_name: Optional[str] = None,
        can_go_back: Optional[bool] = None,
        can_skip: Optional[bool] = None,
    ) -> "FormView":
        """Helper method to associate this form with a process"""
        context = {}
        if process_name:
            context["processName"] = process_name
        if current_step is not None:
            context["currentStep"] = current_step
        if total_steps is not None:
            context["totalSteps"] = total_steps
        if step_name:
            context["stepName"] = step_name
        if can_go_back is not None:
            context["canGoBack"] = can_go_back
        if can_skip is not None:
            context["canSkip"] = can_skip

        self.set_process(process_id, context)
        return self

    def add_field(
        self,
        field_type: str,
        field_id: str,
        field_label: str,
        params: Optional[FormFieldParams] = None,
    ) -> "FormView":
        """Add a field with validation"""
        if not field_id or not field_label or not field_type:
            raise MissingRequiredParameterError("fieldId, fieldLabel, and fieldType")

        # Validate the field
        validation = FieldValidator.validate_field(
            field_type, field_id, field_label, params
        )
        if not validation.is_valid:
            error_messages = [e.message for e in validation.errors]
            raise FieldValidationError(field_id, field_type, error_messages)

        field = {
            "fieldType": field_type,
            "fieldId": field_id,
            "fieldLabel": field_label,
        }

        if params:
            # Add all params to field
            if params.value is not None:
                field["value"] = params.value
            if params.required is not None:
                field["required"] = params.required
            if params.pattern:
                # Convert regex pattern to string representation
                field["pattern"] = params.pattern.pattern
            if params.min is not None:
                field["min"] = params.min
            if params.max is not None:
                field["max"] = params.max
            if params.min_length is not None:
                field["minLength"] = params.min_length
            if params.max_length is not None:
                field["maxLength"] = params.max_length
            if params.options:
                field["options"] = [
                    {
                        "label": opt.label,
                        "value": opt.value,
                        "selected": opt.selected,
                    }
                    for opt in params.options
                ]
            if params.accept:
                field["accept"] = params.accept
            if params.live is not None:
                field["live"] = params.live
            if params.placeholder:
                field["placeholder"] = params.placeholder
            if params.help_text:
                field["helpText"] = params.help_text
            if params.disabled is not None:
                field["disabled"] = params.disabled
            if params.readonly is not None:
                field["readonly"] = params.readonly
            if params.min_date:
                field["minDate"] = params.min_date
            if params.max_date:
                field["maxDate"] = params.max_date

            # Store validation for this field
            self._field_validations[field_id] = params

        self.content["fields"].append(field)
        return self

    def submit_button(
        self, text: str, method: HttpMethod = "POST", confirm_message: Optional[str] = None
    ) -> "FormView":
        """Define submit button for the form"""
        self.content["submit"] = {
            "text": text,
            "method": method,
            "confirmMessage": confirm_message,
        }
        return self

    def update_button(
        self, text: str, confirm_message: Optional[str] = None
    ) -> "FormView":
        """Convenience method for update actions (PUT)"""
        return self.submit_button(text, "PUT", confirm_message)

    def delete_button(
        self, text: str, confirm_message: str = "Are you sure you want to delete this?"
    ) -> "FormView":
        """Convenience method for delete actions (DELETE with confirmation)"""
        return self.submit_button(text, "DELETE", confirm_message)

    # Convenience methods for different field types
    def add_text_field(
        self, field_id: str, field_label: str, is_required: bool = False, max_length: Optional[int] = None
    ) -> "FormView":
        params = FormFieldParams(required=is_required, max_length=max_length)
        return self.add_field("text", field_id, field_label, params)

    def add_email_field(
        self, field_id: str, field_label: str, is_required: bool = False
    ) -> "FormView":
        params = FormFieldParams(required=is_required, pattern=re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
        return self.add_field("email", field_id, field_label, params)

    def add_password_field(
        self, field_id: str, field_label: str, min_length: int = 8
    ) -> "FormView":
        params = FormFieldParams(required=True, min_length=min_length)
        return self.add_field("password", field_id, field_label, params)

    def add_number_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        min_val: Optional[float] = None,
        max_val: Optional[float] = None,
    ) -> "FormView":
        params = FormFieldParams(required=is_required, min=min_val, max=max_val)
        return self.add_field("number", field_id, field_label, params)

    def add_date_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        min_date: Optional[str] = None,
        max_date: Optional[str] = None,
    ) -> "FormView":
        params = FormFieldParams(required=is_required, min_date=min_date, max_date=max_date)
        return self.add_field("date", field_id, field_label, params)

    def add_select_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        options: Optional[List[Dict[str, Any]]] = None,
    ) -> "FormView":
        if not options or len(options) == 0:
            raise EmptyCollectionError(
                "Select field options", "Select field must have at least one option"
            )

        from ..types.models import FormFieldOption
        field_options = [
            FormFieldOption(
                label=opt["label"],
                value=opt["value"],
                selected=opt.get("selected", False),
            )
            for opt in options
        ]

        params = FormFieldParams(required=is_required, options=field_options)
        return self.add_field("select", field_id, field_label, params)

    def add_photo_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        formats: Optional[List[str]] = None,
        live: bool = False,
    ) -> "FormView":
        if not formats:
            formats = ["jpeg", "png"]
        if len(formats) == 0:
            raise EmptyCollectionError(
                "Photo field formats", "Photo field must specify at least one format"
            )

        accepted_formats = [f"image/{f.lower()}" for f in formats]
        params = FormFieldParams(required=is_required, accept=accepted_formats, live=live)
        return self.add_field("photo", field_id, field_label, params)

    def add_file_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        formats: Optional[List[str]] = None,
    ) -> "FormView":
        if not formats or len(formats) == 0:
            raise EmptyCollectionError(
                "File field formats", "File field must specify at least one format"
            )

        params = FormFieldParams(required=is_required, accept=formats)
        return self.add_field("file", field_id, field_label, params)

    def add_gps_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        live_data: bool = False,
        altitude: Optional[bool] = None,
        precision: Optional[bool] = None,
    ) -> "FormView":
        params = FormFieldParams(required=is_required, live=live_data)
        return self.add_field("gps", field_id, field_label, params)

    def add_plus_code_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        live_data: bool = False,
    ) -> "FormView":
        params = FormFieldParams(required=is_required, live=live_data)
        return self.add_field("pluscode", field_id, field_label, params)

    def add_hidden_field(
        self, field_id: str, field_label: str, value: str
    ) -> "FormView":
        params = FormFieldParams(value=value)
        return self.add_field("hidden", field_id, field_label, params)

    def add_text_area_field(
        self,
        field_id: str,
        field_label: str,
        is_required: bool = False,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
    ) -> "FormView":
        params = FormFieldParams(
            required=is_required, min_length=min_length, max_length=max_length
        )
        return self.add_field("textarea", field_id, field_label, params)

    def add_phone_field(
        self, field_id: str, field_label: str, is_required: bool = False
    ) -> "FormView":
        params = FormFieldParams(required=is_required, pattern=re.compile(r"^[\+]?[1-9][\d]{0,15}$"))
        return self.add_field("phone", field_id, field_label, params)

    def add_url_field(
        self, field_id: str, field_label: str, is_required: bool = False
    ) -> "FormView":
        params = FormFieldParams(required=is_required)
        return self.add_field("url", field_id, field_label, params)

    def add_checkbox_field(
        self, field_id: str, field_label: str, is_required: bool = False
    ) -> "FormView":
        params = FormFieldParams(required=is_required)
        return self.add_field("checkbox", field_id, field_label, params)

    def add_separator(self, field_id: Optional[str] = None) -> "FormView":
        """Add a visual separator to group form fields

        Separators are rendered as gaps or lines by the mobile app renderer.

        Args:
            field_id: Optional field ID. If not provided, auto-generates a unique ID.

        Returns:
            self for chaining

        Example:
            form.add_text_field('name', 'Name', True)
                .add_separator()
                .add_email_field('email', 'Email', True)
        """
        import time
        import random
        separator_id = field_id or f"separator-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
        return self.add_field("separator", separator_id, "", None)

    def inject_data(self, data: Dict[str, Any]) -> List[str]:
        """Inject data into existing form fields"""
        errors: List[str] = []

        for field_id, value in data.items():
            field = self.get_field(field_id)
            if not field:
                errors.append(f"Field not found: {field_id}")
                continue

            # Auto-detect: fields with options (select, radio, checkbox with options)
            if field.get("options") and field.get("fieldType") == "select":
                updated_options = [
                    {**opt, "selected": opt["value"] == value}
                    for opt in field["options"]
                ]
                self.update_field(field_id, {"options": updated_options})
            elif field.get("options") and field.get("fieldType") == "radio":
                updated_options = [
                    {**opt, "selected": opt["value"] == value}
                    for opt in field["options"]
                ]
                self.update_field(field_id, {"options": updated_options})
            elif field.get("options") and field.get("fieldType") == "checkbox":
                selected_values = value if isinstance(value, list) else [value]
                updated_options = [
                    {**opt, "selected": opt["value"] in selected_values}
                    for opt in field["options"]
                ]
                self.update_field(field_id, {"options": updated_options})
            else:
                self.update_field(field_id, {"value": value})

        return errors

    def set_field_value(self, field_id: str, value: Any) -> "FormView":
        """Set the value of a specific field"""
        field = self.get_field(field_id)
        if not field:
            raise FieldNotFoundError(field_id, self.id)

        self.update_field(field_id, {"value": value})
        return self

    def validate_form_data(self, form_data: Dict[str, Any]) -> ValidationResult:
        """Validate form data"""
        return FormValidator.validate_form_data(form_data, self._field_validations)

    def get_field(self, field_id: str) -> Optional[Dict[str, Any]]:
        """Get a field by its ID"""
        return next(
            (f for f in self.content["fields"] if f.get("fieldId") == field_id), None
        )

    def remove_field(self, field_id: str) -> bool:
        """Remove a field by its ID"""
        fields = self.content["fields"]
        index = next(
            (i for i, f in enumerate(fields) if f.get("fieldId") == field_id), -1
        )

        if index != -1:
            fields.pop(index)
            if field_id in self._field_validations:
                del self._field_validations[field_id]
            return True

        return False

    def update_field(self, field_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing field"""
        field = self.get_field(field_id)
        if not field:
            return False

        field.update(updates)

        # Update validation
        if field_id in self._field_validations:
            existing_validation = self._field_validations[field_id]
            # Merge updates into validation
            for key, value in updates.items():
                if hasattr(existing_validation, key):
                    setattr(existing_validation, key, value)

        return True

    def get_fields(self) -> List[Dict[str, Any]]:
        """Get all fields"""
        return list(self.content["fields"])

    def get_field_count(self, exclude_separators: bool = False) -> int:
        """Get field count

        Args:
            exclude_separators: If True, excludes separator fields from count (default: False)

        Returns:
            Number of fields
        """
        if exclude_separators:
            return len([
                f for f in self.content["fields"]
                if f.get("fieldType") != "separator"
            ])
        return len(self.content["fields"])

    def has_required_fields(self) -> bool:
        """Check if form has required fields"""
        return any(f.get("required") for f in self.content["fields"])

    def get_required_fields(self) -> List[str]:
        """Get required field IDs"""
        return [
            f["fieldId"] for f in self.content["fields"] if f.get("required")
        ]

