"""
Notification class for sending user notifications
"""

from typing import Optional
from ..types.models import NotificationMessage, NotificationPayload
from ..errors.exceptions import MissingRequiredParameterError


class Notification:
    """Value object describing a notification to send to a specific user.

    Carries the target user_id plus the message (title, body, optional link)
    and serializes via ``to_json()`` to the payload the platform signs and
    sends. Constructed by callers; consumed by YeriaSigner.sign_notification.
    """

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


