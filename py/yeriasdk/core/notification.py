"""
Notification class for sending user notifications
"""

from typing import Optional
from ..types.models import NotificationMessage, NotificationPayload
from ..errors.exceptions import MissingRequiredParameterError


class Notification:
    """Notification for sending to a specific user"""

    def __init__(self, user_id: str, title: str, body: str, link: Optional[str] = None):
        if not user_id or not title or not body:
            raise MissingRequiredParameterError("userId, title, and body")

        self.user_id = user_id
        self.message = NotificationMessage(title=title, body=body, link=link)

    def set_link(self, link: str) -> "Notification":
        """Set the optional in-app navigation link"""
        self.message.link = link
        return self

    def to_json(self) -> NotificationPayload:
        """Returns the notification payload as JSON"""
        return NotificationPayload(user_id=self.user_id, message=self.message)


