# Notification Component Specification

## Description

The `Notification` component enables sending signed notifications to the Yeria platform, which then distributes them to specific users. Notifications are signed using Ed25519 (same as views) and pushed to the Yeria backend (`POST {baseUrl}/api/v1/user/notifications`). Each notification targets a single user and contains a message with title, body, and optional in-app navigation links.

**Key Features:**
- User-specific targeting (userId required)
- Signed notifications with Ed25519
- Push model: SDK sends to the Yeria platform
- Optional in-app navigation links
- Platform distributes to users

## ⚠ Subscription Requirement (fail-closed consent gate)

**The Yeria platform only delivers notifications when the target user has explicitly subscribed to the sending service.** There is no broadcast primitive and no way for a service to create a subscription on a user's behalf — subscriptions are always user-initiated from the Yeria mobile or web app.

When your service signs and POSTs a notification:

| Scenario | HTTP status | Error code in body |
|---|---|---|
| User subscribed, not muted, not blocked | `201 Created` | — (delivery proceeds) |
| User never subscribed (or unsubscribed) | `403 Forbidden` | `SUBSCRIPTION_REQUIRED` |
| User subscribed but muted | `403 Forbidden` | `SUBSCRIPTION_MUTED` |
| User blocked the service | `403 Forbidden` | `SUBSCRIPTION_BLOCKED` |

Rejected notifications are **not** persisted — your service cannot probe the user's subscription state by sending notifications and inspecting responses beyond the error code returned synchronously.

### Recommended onboarding UX

Since your service cannot auto-subscribe a user, present an "Enable notifications" call-to-action in your Yeria views when a user first engages with the service. The CTA should use the canonical Yeria deeplink (`yeria://dl/n/{serviceId}`, or `https://yeria.app/dl/n/{serviceId}`), which prompts the user to grant consent.

Handle `SUBSCRIPTION_*` error codes gracefully — a 403 from the notifications endpoint is an expected outcome for any user who has not opted in, not an infrastructure failure. Consider rate-limiting retries so your service doesn't hammer the endpoint on every rejection.

## Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | Yes | Unique identifier for the target user |
| `message` | `NotificationMessage` | Yes | Notification message object |
| `message.title` | `string` | Yes | Notification title |
| `message.body` | `string` | Yes | Notification body text |
| `message.link` | `string` | No | Optional in-app navigation link (e.g., "/profile" or "app://view/123") |

## Secure Notification Response Structure

When a notification is signed, it follows this structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appId` | `string` | Yes | Application identifier |
| `signature` | `string` | Yes | Ed25519 signature (base64 encoded) |
| `timestamp` | `number` | Yes | Timestamp in milliseconds |
| `notification` | `NotificationPayload` | Yes | Notification payload |
| `notification.userId` | `string` | Yes | Target user ID |
| `notification.message` | `NotificationMessage` | Yes | Message content |

## Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `new Notification(userId, title, body, link?)` | `userId` - User ID<br>`title` - Notification title<br>`body` - Notification body<br>`link` - Optional navigation link | `Notification` | Creates a notification instance |
| `setLink(link)` | `link` - Navigation link URL | `this` | Sets the optional in-app navigation link |
| `signNotification(notification)` | `notification` - Notification instance | `SecureNotificationResponse` | Signs the notification with Ed25519 |
| `sendNotification(notification)` | `notification` - Notification instance | `Promise<void>` | Signs and POSTs the notification to `{baseUrl}/api/v1/user/notifications` |
| `toJSON()` | - | `NotificationPayload` | Returns notification payload as JSON |

## JavaScript Sample Code

### Basic Notification

```javascript
import { YeriaApp, Notification } from '@numerum-tech/yeriasdk';

const yeriaApp = new YeriaApp({
    appId: 'my-app',
    baseUrl: 'https://yeria.app'
});

const notification = new Notification('user-123', 'Welcome!', 'Thank you for joining Yeria')
    .setLink('/welcome');

const signedNotification = yeriaApp.signNotification(notification);
// Send manually or use sendNotification()
```

### Notification with In-App Link

```javascript
const notification = new Notification(
    'user-456',
    'New Message',
    'You have a new message from John',
    '/messages/123'  // Optional link parameter
);

await yeriaApp.sendNotification(notification);
```

### Notification Without Link

```javascript
const notification = new Notification(
    'user-789',
    'Reminder',
    'Don\'t forget to complete your profile'
);

await yeriaApp.sendNotification(notification);
```

### Manual Notification Sending

```javascript
const notification = new Notification('user-123', 'Alert', 'System maintenance scheduled');

const signedNotification = yeriaApp.signNotification(notification);

// Send manually using your HTTP client
const response = await fetch('https://yeria.app/api/v1/user/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedNotification)
});
```

## Python Sample Code

### Basic Notification

```python
from yeriasdk import YeriaApp, YeriaAppConfig, Notification

config = YeriaAppConfig(
    app_id='my-app',
    base_url='https://yeria.app'
)
json_app = YeriaApp(config)

notification = Notification('user-123', 'Welcome!', 'Thank you for joining Yeria')
notification.set_link('/welcome')

signed_notification = json_app.sign_notification(notification)
# Send manually or use send_notification()
```

### Notification with In-App Link

```python
notification = Notification(
    'user-456',
    'New Message',
    'You have a new message from John',
    link='/messages/123'  # Optional link parameter
)

json_app.send_notification(notification)
```

### Notification Without Link

```python
notification = Notification(
    'user-789',
    'Reminder',
    'Don\'t forget to complete your profile'
)

json_app.send_notification(notification)
```

### Manual Notification Sending

```python
import requests

notification = Notification(
    'user-123',
    'Alert',
    'System maintenance scheduled'
)

signed_notification = json_app.sign_notification(notification)

# Send manually using requests
payload = {
    'appId': signed_notification.app_id,
    'signature': signed_notification.signature,
    'timestamp': signed_notification.timestamp,
    'notification': {
        'userId': signed_notification.notification.user_id,
        'message': {
            'title': signed_notification.notification.message.title,
            'body': signed_notification.notification.message.body,
            'link': signed_notification.notification.message.link,
        }
    }
}

response = requests.post(
    'https://yeria.app/api/v1/user/notifications',
    json=payload
)
```

## Complete JSON Example

```json
{
  "appId": "my-app",
  "signature": "MEUCIQD...",
  "timestamp": 1706443200000,
  "notification": {
    "userId": "user-123",
    "message": {
      "title": "Welcome!",
      "body": "Thank you for joining Yeria",
      "link": "/welcome"
    }
  }
}
```

## Configuration

### YeriaAppConfig

Add notification-related configuration to `YeriaAppConfig`:

```typescript
interface YeriaAppConfig {
    appId: string;
    baseUrl?: string;             // Yeria platform base URL (e.g. https://yeria.app)
    notificationTimeout?: number; // HTTP request timeout in ms (default: 5000)
    // ... other config options
}
```

```python
@dataclass
class YeriaAppConfig:
    app_id: str
    base_url: Optional[str] = None  # Yeria platform base URL (e.g. https://yeria.app)
    notification_timeout: int = 5   # HTTP request timeout in seconds
    # ... other config options
```

## Error Handling

- `MissingRequiredParameterError`: Thrown if userId, title, or body is missing
- `ConfigurationError`: Thrown if `baseUrl` is not configured when calling `sendNotification()`
- `ExternalError`: Thrown if HTTP request fails when sending notification

## Signing Details

Notifications use the same Ed25519 signing mechanism as views:

1. Notification payload is serialized to JSON
2. Payload is signed: `JSON.stringify({ notification: notificationJson, timestamp, appId })`
3. Signature is base64 encoded
4. Signed notification includes appId, signature, timestamp, and notification payload

## Platform Integration

The Yeria platform receives signed notifications via HTTP POST:

- **Endpoint**: `{baseUrl}/api/v1/user/notifications` (`baseUrl` from `YeriaAppConfig`)
- **Method**: POST
- **Content-Type**: application/json
- **Body**: Signed notification JSON (see Complete JSON Example above)

The platform verifies the signature and distributes the notification to the target user.
