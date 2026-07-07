"""
MessageView - A view for displaying messages to users
"""

from typing import Literal, Optional, Dict, Any
from datetime import datetime

from ..core.base_view import BaseView
from ..types.models import SubmitAction, HttpMethod
from ..errors.exceptions import InvalidParameterError

MessageSeverity = Literal["info", "success", "warning", "error"]


class MessageView(BaseView):
    """Builds a Message SGUI view — a titled notice/dialog with a severity and
    up to two actions.

    ``set_body`` / ``set_intro`` / ``set_severity`` set the content and tone;
    ``set_primary_action`` and ``set_secondary_action`` (aliased by
    ``submit_button``) define the confirm/cancel buttons, and
    ``set_dismissible`` controls whether it can be closed without acting.

    Extends ``BaseView``; instantiated by the YeriaApp/YeriaUI factory,
    populated with these builders, then serialized to a JSON view description
    and signed into a v3 envelope by ``serve()``.
    """
    @classmethod
    def from_json(cls, json_view):
        """Rehydrate a Message view from a wire JSON payload."""
        return cls.from_json_as('Message', json_view)


    def __init__(self, view_id: str, title: str, process_id: Optional[str] = None):
        super().__init__(
            {
                "id": view_id,
                "type": "Message",
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
            "body": "",
            "severity": "info",
            "confirm": {"text": "OK", "method": "POST"},
            "cancel": None,
            "canDismiss": False,
        }

    def set_intro(self, intro: str) -> "MessageView":
        """Set introduction text"""
        return self._set_intro_text("intro", intro)

    def set_body(self, body: str) -> "MessageView":
        """Set main message body"""
        if not body or not body.strip():
            raise InvalidParameterError("body", body, "Message body cannot be empty")

        self.content["body"] = body.strip()
        return self

    def set_severity(self, severity: MessageSeverity) -> "MessageView":
        """Set message severity"""
        self.content["severity"] = severity
        return self

    def set_primary_action(
        self, text: str, method: HttpMethod = "POST", confirm_message: Optional[str] = None
    ) -> "MessageView":
        """Configure primary action"""
        if not text or not text.strip():
            raise InvalidParameterError("text", text, "Primary action text cannot be empty")

        self.content["confirm"] = {
            "text": text.strip(),
            "method": method,
            "confirmMessage": confirm_message,
        }
        return self

    def submit_button(
        self, text: str, method: HttpMethod = "POST", confirm_message: Optional[str] = None
    ) -> "MessageView":
        """Alias for set_primary_action (compatibility)"""
        return self.set_primary_action(text, method, confirm_message)

    def set_secondary_action(
        self, text: str, method: HttpMethod = "POST", confirm_message: Optional[str] = None
    ) -> "MessageView":
        """Configure secondary action"""
        if not text or not text.strip():
            raise InvalidParameterError("text", text, "Secondary action text cannot be empty")

        self.content["cancel"] = {
            "text": text.strip(),
            "method": method,
            "confirmMessage": confirm_message,
        }
        return self

    def clear_secondary_action(self) -> "MessageView":
        """Remove secondary action if it exists"""
        self.content["cancel"] = None
        return self

    def set_dismissible(self, dismissible: bool = True) -> "MessageView":
        """Set if message can be dismissed without action"""
        self.content["canDismiss"] = dismissible
        return self

    def set_metadata(self, metadata: Dict[str, Any]) -> "MessageView":
        """Add message-specific metadata"""
        self.content["meta"] = dict(metadata)
        return self

