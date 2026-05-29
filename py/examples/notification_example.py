#!/usr/bin/env python3

"""
Notification usage example for the YeriaApp SDK
Run with: python examples/notification_example.py
"""

from yeriasdk import YeriaApp, YeriaAppConfig


def header(title: str) -> None:
    print(f"\n{title}")
    print("=" * len(title))


header("YeriaApp SDK – Notification Example")

# 1. Initialize YeriaApp with platform URL
config = YeriaAppConfig(
    app_id="example-app",
    platform_url="https://platform.yeria.com/api/notifications",  # Optional: can also pass per-call
)
json_app = YeriaApp(config)

print("✅ YeriaApp ready for notifications")

# 2. Create a basic notification
header("Creating Notifications")

welcome_notification = (
    json_app.create_notification(
        "user-123",
        "Welcome!",
        "Thank you for joining City-Mate. Get started by completing your profile.",
    )
    .set_link("/welcome")
)

print("✅ Created welcome notification")

# 3. Create notification with link in constructor
message_notification = json_app.create_notification(
    "user-456",
    "New Message",
    "You have a new message from John Doe",
    link="/messages/123",
)

print("✅ Created message notification with link")

# 4. Create notification without link
reminder_notification = json_app.create_notification(
    "user-789",
    "Reminder",
    "Don't forget to complete your profile to unlock all features",
)

print("✅ Created reminder notification")

# 5. Sign notifications
header("Signing Notifications")

signed_welcome = json_app.sign_notification(welcome_notification)
print(
    "✅ Signed welcome notification:",
    {
        "appId": signed_welcome.app_id,
        "timestamp": signed_welcome.timestamp,
        "userId": signed_welcome.notification.user_id,
        "title": signed_welcome.notification.message.title,
    },
)

# 6. Send notifications (commented out - requires actual platform endpoint)
header("Sending Notifications")

# Uncomment to actually send (requires valid platform URL):
"""
try:
    json_app.send_notification(welcome_notification)
    print("✅ Sent welcome notification")
    
    json_app.send_notification(message_notification)
    print("✅ Sent message notification")
    
    json_app.send_notification(reminder_notification)
    print("✅ Sent reminder notification")
except Exception as error:
    print(f"❌ Failed to send notification: {error}")
"""

# 7. Manual sending example
header("Manual Notification Sending")

signed_notification = json_app.sign_notification(welcome_notification)

print("Signed notification payload:")
import json

payload = {
    "appId": signed_notification.app_id,
    "signature": signed_notification.signature,
    "timestamp": signed_notification.timestamp,
    "notification": {
        "userId": signed_notification.notification.user_id,
        "message": {
            "title": signed_notification.notification.message.title,
            "body": signed_notification.notification.message.body,
            "link": signed_notification.notification.message.link,
        },
    },
}
print(json.dumps(payload, indent=2))

# You can send this manually using requests:
"""
import requests

response = requests.post(
    'https://platform.yeria.com/api/notifications',
    json=payload
)

if not response.ok:
    raise Exception(f"Failed to send: {response.status_text}")
"""

# 8. Dynamic platform URL
header("Dynamic Platform URL")

config_no_url = YeriaAppConfig(app_id="example-app")
json_app_no_url = YeriaApp(config_no_url)

dynamic_notification = json_app_no_url.create_notification(
    "user-999", "Test", "Testing dynamic URL"
)

# Override platform URL per call:
"""
json_app_no_url.send_notification(
    dynamic_notification,
    platform_url='https://staging.yeria.com/api/notifications'
)
"""

print("\n✅ Notification examples completed\n")


