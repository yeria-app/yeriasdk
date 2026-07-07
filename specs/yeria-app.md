# YeriaApp Main Class Specification

## Description

The `YeriaApp` class is the main entry point for creating secure, signed views. It provides factory methods for creating all view types and handles Ed25519 signature generation and verification for view integrity.

**Key Features:**
- Automatic Ed25519 key pair generation (if not provided)
- Secure view signing with timestamps
- View expiration management
- Signature verification
- Factory methods for all view types

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appId` | `string` | Yes | Unique application identifier |
| `privateKey` | `string` | No | Ed25519 private key (PEM format). Auto-generated if not provided |
| `publicKey` | `string` | No | Ed25519 public key (PEM format). Auto-generated if not provided |
| `allowedDomains` | `string[]` | No | Allowed domains for view serving (default: []) |
| `viewExpirationMinutes` | `number` | No | View expiration time in minutes (default: 60) |

## Methods

### Constructor

```javascript
new YeriaApp(config: YeriaAppConfig)
```

Creates a new YeriaApp instance with the provided configuration.

### Factory Methods

All factory methods create and return view instances:

- `createFormView(formId: string, title: string, processId?: string): FormView`
- `createReaderView(viewId: string, title: string, processId?: string): ReaderView`
- `createActionListView(viewId: string, title: string, processId?: string): ActionListView`
- `createActionGridView(viewId: string, title: string, processId?: string): ActionGridView`
- `createQRScanView(viewId: string, title: string, processId?: string): QRScanView`
- `createQRDisplayView(viewId: string, title: string, processId?: string): QRDisplayView`
- `createMessageView(viewId: string, title: string, processId?: string): MessageView`
- `createCardView(viewId: string, title: string, processId?: string): CardView`
- `createCarouselView(viewId: string, title: string, processId?: string): CarouselView`
- `createTimelineView(viewId: string, title: string, processId?: string): TimelineView`
- `createMediaView(viewId: string, title: string, processId?: string): MediaView`
- `createMapView(viewId: string, title: string, processId?: string): MapView`

### Serving Views

```javascript
serve(view: BaseView): SecureViewResponse
```

Generates a signed response for a view. Returns an object with:
- `appId`: Application identifier
- `signature`: Ed25519 signature (base64)
- `timestamp`: Timestamp in milliseconds
- `view`: The view JSON object

```javascript
serveRawView(view: Record<string, unknown>): SignedEnvelope
```

Signs a pre-built view JSON block directly. This is intended for providers that mostly return static screens and do not need the builder API for every field.

### Verification

```javascript
verifyIntegrity(response: SecureViewResponse): boolean
```

Verifies the integrity of a secure view response. Throws errors if:
- AppId doesn't match
- View has expired
- Signature is invalid

### Static Methods

```javascript
static verifySignature(
    publicKey: string,
    response: SecureViewResponse,
    onError?: (error: Error) => void
): boolean
```

Static method to verify a signature on the frontend/client side.

```javascript
static signView(
    view: Record<string, unknown>,
    appId: string,
    privateKey: string,
    timestamp?: number
): SecureViewResponse
```

Static method to sign a view without creating a YeriaApp instance.

### Public Key Access

```javascript
getPublicKey(): string
```

Returns the public key for client-side verification.

## SecureViewResponse Type

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | Application identifier |
| `signature` | `string` | Ed25519 signature (base64 encoded) |
| `timestamp` | `number` | Timestamp in milliseconds |
| `view` | `Record<string, unknown>` | The view JSON object |

## Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `constructor(config)` | `config` - YeriaAppConfig object | `YeriaApp` | Creates a new YeriaApp instance |
| `createFormView(formId, title, processId?)` | `formId` - Form identifier<br>`title` - Form title<br>`processId` - Optional process ID | `FormView` | Creates a form view |
| `createReaderView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `ReaderView` | Creates a reader view |
| `createActionListView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `ActionListView` | Creates an action list view |
| `createActionGridView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `ActionGridView` | Creates an action grid view |
| `createQRScanView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `QRScanView` | Creates a QR scan view |
| `createQRDisplayView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `QRDisplayView` | Creates a QR display view |
| `createMessageView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `MessageView` | Creates a message view |
| `createCardView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `CardView` | Creates a card view |
| `createCarouselView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `CarouselView` | Creates a carousel view |
| `createTimelineView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `TimelineView` | Creates a timeline view |
| `createMediaView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `MediaView` | Creates a media view |
| `createMapView(viewId, title, processId?)` | `viewId` - View identifier<br>`title` - View title<br>`processId` - Optional process ID | `MapView` | Creates a map view |
| `serve(view)` | `view` - BaseView instance | `SecureViewResponse` | Generates a signed response for a view |
| `serveRawView(view)` | `view` - plain view JSON object | `SignedEnvelope` | Signs a pre-built static view payload |
| `verifyIntegrity(response)` | `response` - SecureViewResponse object | `boolean` | Verifies the integrity of a secure view response |
| `getPublicKey()` | - | `string` | Returns the public key for client-side verification |
| `static verifySignature(publicKey, response, onError?)` | `publicKey` - Public key (PEM)<br>`response` - SecureViewResponse<br>`onError` - Optional error callback | `boolean` | Static method to verify signature on client side |
| `static signView(view, appId, privateKey, timestamp?)` | `view` - View object<br>`appId` - Application ID<br>`privateKey` - Private key (PEM)<br>`timestamp` - Optional timestamp | `SecureViewResponse` | Static method to sign a view without creating YeriaApp instance |

## JavaScript Sample Code

### Basic Usage

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

// Initialize with auto-generated keys
const yeriaApp = new YeriaApp({
    appId: 'my-app',
    viewExpirationMinutes: 30
});

// Get public key for client verification
const publicKey = yeriaApp.getPublicKey();

// Create and serve a view
const form = yeriaApp
    .createFormView('registration', 'User Registration')
    .addTextField('name', 'Name', true)
    .submitButton('Register', 'POST');

const response = yeriaApp.serve(form);
// Response: { appId, signature, timestamp, view }

// Verify integrity
const isValid = yeriaApp.verifyIntegrity(response);
```

### Serving a Static JSON View

```javascript
const response = yeriaApp.serveRawView({
  id: 'home-static',
  type: 'Reader',
  content: {
    title: 'Welcome',
    body: [
      { type: 'paragraph', text: 'This screen is mostly static.' }
    ]
  }
});
```

## Complete JSON Example (Secure View Response)

When a view is served through `yeriaApp.serve(view)`, it returns a secure response with signature:

```json
{
  "appId": "my-app",
  "signature": "MEUCIQD...",
  "timestamp": 1706443200000,
  "view": {
    "id": "user-registration",
    "type": "Form",
    "content": {
      "title": "User Registration",
      "intro": "Please fill in your information",
      "submit": {
        "text": "Register",
        "method": "POST"
      },
      "fields": [
        {
          "fieldType": "text",
          "fieldId": "firstName",
          "fieldLabel": "First Name",
          "required": true,
          "placeholder": "Enter your first name"
        },
        {
          "fieldType": "email",
          "fieldId": "email",
          "fieldLabel": "Email Address",
          "required": true,
          "placeholder": "you@example.com"
        }
      ]
    },
    "metadata": {
      "version": "1.0.0",
      "createdAt": "2025-01-28T10:00:00.000Z"
    }
  }
}
```

The `signature` field contains an Ed25519 signature of the JSON-serialized `view` object, allowing the mobile app to verify the integrity and authenticity of the view data.

### With Custom Keys

```javascript
import { generateKeyPairSync } from 'crypto';

// Generate Ed25519 key pair
const keyPair = generateKeyPairSync('ed25519');
const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' });

// Initialize with custom keys
const yeriaApp = new YeriaApp({
    appId: 'my-app',
    privateKey: privateKey,
    publicKey: publicKey,
    viewExpirationMinutes: 60
});
```

### Creating Multiple Views

```javascript
const yeriaApp = new YeriaApp({ appId: 'my-app' });

// Create multiple views
const views = [
    yeriaApp.createFormView('form-1', 'Form 1'),
    yeriaApp.createReaderView('reader-1', 'Reader 1'),
    yeriaApp.createActionListView('menu', 'Main Menu')
];

// Serve all views
const responses = views.map(view => yeriaApp.serve(view));
```

### Client-Side Verification

```javascript
// On the client side
import { YeriaApp } from '@numerum-tech/yeriasdk';

const publicKey = '...'; // Get from server
const response = {
    appId: 'my-app',
    signature: '...',
    timestamp: 1234567890,
    view: { ... }
};

// Verify signature
const isValid = YeriaApp.verifySignature(publicKey, response, (error) => {
    console.error('Verification error:', error);
});

if (isValid) {
    // Use the view
    console.log('View is valid:', response.view);
} else {
    console.error('View signature is invalid');
}
```

### Static Signing

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { generateKeyPairSync } from 'crypto';

const keyPair = generateKeyPairSync('ed25519');
const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });

const view = {
    id: 'my-view',
    type: 'Form',
    content: { ... }
};

// Sign without creating YeriaApp instance
const signedResponse = YeriaApp.signView(
    view,
    'my-app',
    privateKey,
    Date.now()
);
```

### Error Handling

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { 
    AppIdMismatchError,
    ViewExpiredError,
    SignatureVerificationError
} from '@numerum-tech/yeriasdk';

const yeriaApp = new YeriaApp({ appId: 'my-app' });

try {
    const response = yeriaApp.serve(view);
    const isValid = yeriaApp.verifyIntegrity(response);
} catch (error) {
    if (error instanceof AppIdMismatchError) {
        console.error('App ID mismatch:', error.message);
    } else if (error instanceof ViewExpiredError) {
        console.error('View expired:', error.message);
    } else if (error instanceof SignatureVerificationError) {
        console.error('Invalid signature:', error.message);
    }
}
```

### Complete Example

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

// Initialize
const yeriaApp = new YeriaApp({
    appId: 'example-app',
    viewExpirationMinutes: 30
});

// Create a form view
const form = yeriaApp
    .createFormView('user-registration', 'User Registration')
    .setIntro('Please fill in all required fields')
    .addTextField('firstName', 'First Name', true)
    .addEmailField('email', 'Email', true)
    .submitButton('Register', 'POST');

// Serve the view (generates signature)
const response = yeriaApp.serve(form);

// Response structure:
// {
//     appId: 'example-app',
//     signature: 'base64-encoded-signature',
//     timestamp: 1234567890123,
//     view: {
//         id: 'user-registration',
//         type: 'Form',
//         content: { ... }
//     }
// }

// Verify integrity (server-side)
try {
    const isValid = yeriaApp.verifyIntegrity(response);
    console.log('View is valid:', isValid);
} catch (error) {
    console.error('Verification failed:', error);
}

// Get public key for client-side verification
const publicKey = yeriaApp.getPublicKey();
```
