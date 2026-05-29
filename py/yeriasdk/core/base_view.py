"""
Base view class for all Yeria views
"""

import json
import copy
from typing import Dict, Any, Optional, List
from abc import ABC

from ..types.models import (
    BaseViewConfig,
    ViewType,
    ValidationResult,
    ViewState,
    NavigationConfig,
    ProcessContext,
    ViewMetadata,
    create_validation_error,
)
from ..errors.exceptions import (
    ViewValidationError,
    NoProcessContextError,
    InvalidParameterError,
)
from typing import Dict, Any, Optional, List, Union
from ..utils.validators import validate_submission_url, DEFAULT_URL_CONFIG


class BaseView(ABC):
    """Abstract base class for all view types"""

    def __init__(self, config: Union[BaseViewConfig, Dict[str, Any]]):
        if isinstance(config, dict):
            config = self._dict_to_config(config)

        self.id: str = config.id
        self.type: ViewType = config.type
        self.content: Any = None
        self._state: ViewState = {}
        self._metadata: Optional[ViewMetadata] = config.metadata
        self._navigation: Optional[NavigationConfig] = None
        self._process_context: Optional[ProcessContext] = config.process_id and ProcessContext(
            process_id=config.process_id
        ) or None

    @staticmethod
    def _dict_to_config(data: Dict[str, Any]) -> BaseViewConfig:
        """Convertir un dictionnaire en BaseViewConfig"""
        from datetime import datetime

        # Gérer la metadata
        metadata = None
        if "metadata" in data:
            meta = data["metadata"]
            if isinstance(meta, dict):
                metadata = ViewMetadata(
                    version=meta.get("version", "1.0.0"),
                    created_at=meta.get("created_at", datetime.now()),
                    author=meta.get("author"),
                    tags=meta.get("tags"),
                )
            else:
                metadata = meta

        return BaseViewConfig(
            id=data["id"],
            type=data["type"],
            process_id=data.get("process_id"),
            metadata=metadata,
        )

    def _validate(self) -> ValidationResult:
        """Validate the view before serving"""
        errors: List[Any] = []
        warnings: List[Any] = []

        if not self.id or not self.id.strip():
            errors.append(create_validation_error("View ID is required"))

        if not self.type:
            errors.append(create_validation_error("View type is required"))

        if not self.content:
            errors.append(create_validation_error("View content is required"))

        # Type-specific validation
        if self.type == "Form":
            if (
                not self.content
                or not isinstance(self.content, dict)
                or "fields" not in self.content
                or not isinstance(self.content["fields"], list)
                or len(self.content["fields"]) == 0
            ):
                errors.append(
                    create_validation_error("Form must have at least one field")
                )
            else:
                # Exclude separator fields from "at least one field" validation
                non_separator_fields = [
                    f for f in self.content["fields"]
                    if f.get("fieldType") != "separator"
                ]
                if len(non_separator_fields) == 0:
                    errors.append(
                        create_validation_error(
                            "Form must have at least one non-separator field"
                        )
                    )

        elif self.type in ("ActionList", "ActionGrid"):
            if (
                not self.content
                or not isinstance(self.content, dict)
                or "actions" not in self.content
                or not isinstance(self.content["actions"], list)
                or len(self.content["actions"]) == 0
            ):
                errors.append(
                    create_validation_error(
                        "Action views must have at least one action"
                    )
                )

        elif self.type == "Reader":
            if isinstance(self.content, dict):
                reader_content = self.content
                if not reader_content.get("title") or not reader_content.get("title", "").strip():
                    errors.append(
                        create_validation_error("Reader view must have a title")
                    )
                if (
                    not reader_content.get("elements")
                    or len(reader_content.get("elements", [])) == 0
                ):
                    errors.append(
                        create_validation_error(
                            "Reader view must contain at least one element"
                        )
                    )

        elif self.type == "Message":
            if isinstance(self.content, dict):
                message_content = self.content
                has_body = (
                    isinstance(message_content.get("body"), str)
                    and len(message_content.get("body", "").strip()) > 0
                )
                has_intro = (
                    isinstance(message_content.get("intro"), str)
                    and len(message_content.get("intro", "").strip()) > 0
                )

                if not has_body and not has_intro:
                    errors.append(
                        create_validation_error(
                            "Message view must define a body or an intro"
                        )
                    )

                if not message_content.get("confirm"):
                    errors.append(
                        create_validation_error(
                            "Message view must define a primary action"
                        )
                    )
            else:
                errors.append(create_validation_error("Message view content is invalid"))

        elif self.type == "Card":
            if isinstance(self.content, dict):
                card = self.content
                has_detail = (
                    (isinstance(card.get("description"), str) and len(card.get("description", "").strip()) > 0)
                    or (isinstance(card.get("stats"), list) and len(card.get("stats", [])) > 0)
                    or (isinstance(card.get("sections"), list) and len(card.get("sections", [])) > 0)
                )

                if not has_detail:
                    errors.append(
                        create_validation_error(
                            "Card view requires at least a description, stat, or section"
                        )
                    )
            else:
                errors.append(create_validation_error("Card view content is invalid"))

        elif self.type == "Carousel":
            if (
                not self.content
                or not isinstance(self.content, dict)
                or "slides" not in self.content
                or not isinstance(self.content["slides"], list)
                or len(self.content["slides"]) == 0
            ):
                errors.append(
                    create_validation_error("Carousel view must contain at least one slide")
                )

        elif self.type == "Timeline":
            if (
                not self.content
                or not isinstance(self.content, dict)
                or "items" not in self.content
                or not isinstance(self.content["items"], list)
                or len(self.content["items"]) == 0
            ):
                errors.append(
                    create_validation_error(
                        "Timeline view must contain at least one entry"
                    )
                )

        elif self.type == "Media":
            if (
                not self.content
                or not isinstance(self.content, dict)
                or "items" not in self.content
                or not isinstance(self.content["items"], list)
                or len(self.content["items"]) == 0
            ):
                errors.append(
                    create_validation_error(
                        "Media view must contain at least one resource"
                    )
                )

        elif self.type == "Map":
            if not self.content or not isinstance(self.content, dict):
                errors.append(create_validation_error("Map view content is required"))
            else:
                layers = self.content.get("layers") if isinstance(self.content.get("layers"), list) else []

                # unique layer ids
                seen_layer_ids = set()
                for l in layers:
                    if not isinstance(l, dict):
                        continue
                    lid = l.get("id")
                    if not isinstance(lid, str) or not lid.strip():
                        errors.append(create_validation_error("Map layer must have a non-empty id"))
                    elif lid in seen_layer_ids:
                        errors.append(create_validation_error(f'Duplicate map layer id: "{lid}"'))
                    else:
                        seen_layer_ids.add(lid)

                mode = "pick" if self.content.get("mode") == "pick" else "view"

                if mode == "pick":
                    pick = self.content.get("pick")
                    submit = pick.get("submitUrl") if isinstance(pick, dict) else None
                    if not isinstance(submit, str) or not submit.strip():
                        errors.append(create_validation_error("Map pick mode requires pick.submitUrl"))
                else:
                    def _drawable(l: dict) -> bool:
                        if l.get("visible") is False:
                            return False
                        t = l.get("type")
                        if t == "markers":
                            return isinstance(l.get("markers"), list) and len(l["markers"]) > 0
                        if t == "shapes":
                            return isinstance(l.get("shapes"), list) and len(l["shapes"]) > 0
                        if t == "heatmap":
                            return isinstance(l.get("points"), list) and len(l["points"]) > 0
                        if t == "tiles":
                            return isinstance(l.get("url"), str) and l["url"]
                        if t == "geojson":
                            return l.get("data") is not None
                        return False

                    has_drawable = any(_drawable(l) for l in layers if isinstance(l, dict))
                    empty_msg = self.content.get("emptyMessage")
                    has_empty = isinstance(empty_msg, str) and empty_msg.strip()
                    if not has_drawable and not has_empty:
                        errors.append(create_validation_error(
                            "Map view must contain at least one drawable layer or an emptyMessage"
                        ))

        elif self.type == "QRDisplay":
            if (
                not self.content
                or not isinstance(self.content, dict)
                or not self.content.get("qrImage")
                or not self.content.get("qrTitle")
                or not self.content.get("qrDescription")
            ):
                errors.append(
                    create_validation_error(
                        "QRDisplay view must have a QR code with image, title, and description"
                    )
                )

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings if warnings else None,
        )

    def serve(self) -> Dict[str, Any]:
        """Serve the view with validation"""
        validation = self._validate()

        if not validation.is_valid:
            error_messages = [e.message for e in validation.errors]
            raise ViewValidationError(self.id, self.type, error_messages)

        result: Dict[str, Any] = {
            "id": self.id,
            "type": self.type,
            "content": self.content,
        }

        # Add process context if present
        if self._process_context:
            result["process"] = {
                "processId": self._process_context.process_id,
                "processName": self._process_context.process_name,
                "currentStep": self._process_context.current_step,
                "totalSteps": self._process_context.total_steps,
                "stepName": self._process_context.step_name,
                "canGoBack": self._process_context.can_go_back,
                "canSkip": self._process_context.can_skip,
                "metadata": self._process_context.metadata,
            }

        # Add metadata if present
        if self._metadata:
            result["metadata"] = {
                "version": self._metadata.version,
                "createdAt": self._metadata.created_at.isoformat(),
                "author": self._metadata.author,
                "tags": self._metadata.tags,
            }

        # Add state if present
        if self._state:
            result["state"] = self._state

        # Add navigation if present
        if self._navigation:
            result["nav"] = {
                "next": self._navigation.next,
                "prev": self._navigation.prev,
            }

        return result

    def to_json(self) -> Dict[str, Any]:
        """Return JSON representation of the view"""
        return self.serve()

    def set_state(self, key: str, value: Any) -> None:
        """Update view state"""
        self._state[key] = value

    def get_state(self, key: str) -> Any:
        """Get a value from state"""
        return self._state.get(key)

    def clone(self) -> "BaseView":
        """Clone the view using deep copy"""
        cloned = copy.deepcopy(self)
        return cloned

    def is_valid(self) -> bool:
        """Check if the view is valid"""
        return self._validate().is_valid

    def validate_view(self) -> ValidationResult:
        """Validate the view and return the result"""
        return self._validate()

    def get_validation_errors(self) -> List[str]:
        """Get validation errors"""
        return [e.message for e in self._validate().errors]

    def get_validation_warnings(self) -> List[str]:
        """Get validation warnings"""
        warnings = self._validate().warnings
        return [e.message for e in warnings] if warnings else []

    def update_metadata(self, metadata: Dict[str, Any]) -> None:
        """Update metadata"""
        if self._metadata:
            # Merge metadata
            if "version" in metadata:
                self._metadata.version = metadata["version"]
            if "created_at" in metadata or "createdAt" in metadata:
                created_at = metadata.get("created_at") or metadata.get("createdAt")
                if isinstance(created_at, str):
                    from datetime import datetime
                    self._metadata.created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if "author" in metadata:
                self._metadata.author = metadata.get("author")
            if "tags" in metadata:
                self._metadata.tags = metadata.get("tags")
        else:
            # Create new metadata
            from datetime import datetime
            self._metadata = ViewMetadata(
                version=metadata.get("version", "1.0.0"),
                created_at=datetime.now(),
                author=metadata.get("author"),
                tags=metadata.get("tags"),
            )

    def get_metadata(self) -> Optional[ViewMetadata]:
        """Get metadata"""
        return self._metadata

    def _set_intro_text(self, field_name: str, value: str) -> "BaseView":
        """Protected helper to set intro/note text with strict validation"""
        if not value or not value.strip():
            raise InvalidParameterError(
                field_name, value, f"{field_name} text cannot be empty"
            )

        trimmed_value = value.strip()

        if isinstance(self.content, dict):
            self.content[field_name] = trimmed_value

        return self

    def set_next(self, url: str) -> "BaseView":
        """Set next view (navigation) with URL validation"""
        # Validate URL for security
        config = DEFAULT_URL_CONFIG
        config.block_localhost = False  # Allow localhost for development
        config.block_private_ips = False  # Allow private IPs for development

        validation = validate_submission_url(url, config)

        if not validation.is_valid:
            error_messages = "; ".join([e.message for e in validation.errors])
            raise InvalidParameterError(
                "url", url, f"Invalid navigation URL: {error_messages}"
            )

        if not self._navigation:
            self._navigation = NavigationConfig()
        self._navigation.next = url
        return self

    def set_prev(self, url: str) -> "BaseView":
        """Set previous view (navigation) with URL validation"""
        # Validate URL for security
        config = DEFAULT_URL_CONFIG
        config.block_localhost = False  # Allow localhost for development
        config.block_private_ips = False  # Allow private IPs for development

        validation = validate_submission_url(url, config)

        if not validation.is_valid:
            error_messages = "; ".join([e.message for e in validation.errors])
            raise InvalidParameterError(
                "url", url, f"Invalid navigation URL: {error_messages}"
            )

        if not self._navigation:
            self._navigation = NavigationConfig()
        self._navigation.prev = url
        return self

    def set_process(
        self, process_id: str, context: Optional[Dict[str, Any]] = None
    ) -> "BaseView":
        """Set process context for this view"""
        self._process_context = ProcessContext(
            process_id=process_id,
            process_name=context.get("processName") if context else None,
            current_step=context.get("currentStep") if context else None,
            total_steps=context.get("totalSteps") if context else None,
            step_name=context.get("stepName") if context else None,
            can_go_back=context.get("canGoBack") if context else None,
            can_skip=context.get("canSkip") if context else None,
            metadata=context.get("metadata") if context else None,
        )
        return self

    def get_process_context(self) -> Optional[ProcessContext]:
        """Get process context"""
        return self._process_context

    def get_process_id(self) -> Optional[str]:
        """Get process ID (shortcut)"""
        return self._process_context.process_id if self._process_context else None

    def has_process(self) -> bool:
        """Check if this view is part of a process"""
        return self._process_context is not None

    def update_process_context(self, updates: Dict[str, Any]) -> "BaseView":
        """Update process context"""
        if not self._process_context:
            raise NoProcessContextError(self.id, "update")

        # Update process context
        if "processName" in updates:
            self._process_context.process_name = updates["processName"]
        if "currentStep" in updates:
            self._process_context.current_step = updates["currentStep"]
        if "totalSteps" in updates:
            self._process_context.total_steps = updates["totalSteps"]
        if "stepName" in updates:
            self._process_context.step_name = updates["stepName"]
        if "canGoBack" in updates:
            self._process_context.can_go_back = updates["canGoBack"]
        if "canSkip" in updates:
            self._process_context.can_skip = updates["canSkip"]
        if "metadata" in updates:
            self._process_context.metadata = updates["metadata"]

        return self

    def destroy(self) -> None:
        """Clean up view resources"""
        self._state = {}


