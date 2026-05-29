# MessageView Component Specification

## Description

The `MessageView` component displays messages, notifications, alerts, or confirmations to users. It supports different severity levels (info, success, warning, error) and can include primary and secondary actions. Messages can be dismissible or require user interaction.

Common use cases include:
- Success messages after form submission
- Error notifications
- Information alerts
- Confirmation dialogs
- Welcome messages

## Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the message view |
| `type` | `string` | Yes | Always `"Message"` |
| `content` | `MessageContent` | Yes | Message content object |
| `content.title` | `string` | Yes | Message title |
| `content.intro` | `string` | No | Introduction text displayed before body |
| `content.body` | `string` | Yes* | Main message body (required if intro is not provided) |
| `content.severity` | `string` | No | Message severity: `"info"`, `"success"`, `"warning"`, `"error"` (default: `"info"`) |
| `content.confirm` | `SubmitAction` | Yes | Primary action button (required) |
| `content.confirm.text` | `string` | Yes | Button text |
| `content.confirm.method` | `HttpMethod` | No | HTTP method (default: POST) |
| `content.confirm.confirmMessage` | `string` | No | Optional confirmation dialog message |
| `content.cancel` | `SubmitAction` | No | Secondary action button (optional) |
| `content.cancel.text` | `string` | Yes* | Button text (required if cancel is set) |
| `content.cancel.method` | `HttpMethod` | No | HTTP method (default: POST) |
| `content.cancel.confirmMessage` | `string` | No | Optional confirmation dialog message |
| `content.canDismiss` | `boolean` | No | Whether message can be dismissed without action (default: false) |
| `content.meta` | `Record<string, unknown>` | No | Optional metadata |
| `processId` | `string` | No | Process identifier for multi-step workflows |
| `metadata` | `object` | No | View metadata (version, createdAt, author, tags) |

## Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setIntro(intro)` | `intro` - Introduction text | `this` | Sets the introduction text displayed before body |
| `setBody(body)` | `body` - Message body text | `this` | Sets the main message body (required if intro not provided) |
| `setSeverity(severity)` | `severity` - Severity level ('info', 'success', 'warning', 'error') | `this` | Sets the message severity level |
| `setPrimaryAction(text, method?, confirmMessage?)` | `text` - Button text<br>`method` - HTTP method (default: POST)<br>`confirmMessage` - Optional confirmation | `this` | Configures the primary action button |
| `submitButton(text, method?, confirmMessage?)` | `text` - Button text<br>`method` - HTTP method (default: POST)<br>`confirmMessage` - Optional confirmation | `this` | Alias for setPrimaryAction() |
| `setSecondaryAction(text, method?, confirmMessage?)` | `text` - Button text<br>`method` - HTTP method (default: POST)<br>`confirmMessage` - Optional confirmation | `this` | Configures the secondary action button |
| `clearSecondaryAction()` | - | `this` | Removes the secondary action if present |
| `setDismissible(dismissible?)` | `dismissible` - Dismissible flag (default: true) | `this` | Sets whether message can be dismissed without action |
| `setMetadata(metadata)` | `metadata` - Metadata object | `this` | Sets custom metadata |
| `serve()` | - | `Record<string, unknown>` | Serves the view with validation (inherited from BaseView) |
| `toJSON()` | - | `Record<string, unknown>` | Returns JSON representation (inherited from BaseView) |
| `setState(key, value)` | `key` - State key<br>`value` - State value | `void` | Sets view state (inherited from BaseView) |
| `getState(key)` | `key` - State key | `unknown` | Gets view state (inherited from BaseView) |
| `setNext(url)` | `url` - Next view URL | `this` | Sets next view navigation (inherited from BaseView) |
| `setPrev(url)` | `url` - Previous view URL | `this` | Sets previous view navigation (inherited from BaseView) |
| `setProcess(processId, context?)` | `processId` - Process ID<br>`context` - Process context | `this` | Sets process context (inherited from BaseView) |

## JavaScript Sample Code

### Basic Info Message

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

const yeriaApp = new YeriaApp({ appId: 'my-app' });

const message = yeriaApp
    .createMessageView('welcome', 'Welcome!')
    .setIntro('Here are the important announcements for this week')
    .setBody('Discover the main features of version 2.0 and update your profile to enjoy the new features.')
    .setSeverity('info')
    .setPrimaryAction('Got it', 'POST');

const response = yeriaApp.serve(message);
```

### Success Message

```javascript
const message = yeriaApp
    .createMessageView('success', 'Success!')
    .setBody('Your account has been created successfully.')
    .setSeverity('success')
    .setPrimaryAction('Continue', 'POST');
```

### Error Message

```javascript
const message = yeriaApp
    .createMessageView('error', 'Error')
    .setBody('An error occurred while processing your request. Please try again.')
    .setSeverity('error')
    .setPrimaryAction('Retry', 'POST')
    .setSecondaryAction('Cancel', 'POST');
```

### Warning Message

```javascript
const message = yeriaApp
    .createMessageView('warning', 'Warning')
    .setBody('Your session will expire in 5 minutes. Please save your work.')
    .setSeverity('warning')
    .setPrimaryAction('Save Now', 'POST')
    .setSecondaryAction('Continue', 'POST');
```

### Dismissible Message

```javascript
const message = yeriaApp
    .createMessageView('notification', 'Notification')
    .setBody('You have 3 new messages.')
    .setSeverity('info')
    .setPrimaryAction('View Messages', 'POST')
    .setDismissible(true);  // User can dismiss without action
```

### Confirmation Dialog

```javascript
const message = yeriaApp
    .createMessageView('confirm-delete', 'Confirm Deletion')
    .setBody('Are you sure you want to delete this item? This action cannot be undone.')
    .setSeverity('warning')
    .setPrimaryAction('Delete', 'DELETE', 'Are you absolutely sure?')
    .setSecondaryAction('Cancel', 'POST');
```

### Message with Intro and Body

```javascript
const message = yeriaApp
    .createMessageView('announcement', 'New Features')
    .setIntro('We\'re excited to announce new features!')
    .setBody('Version 2.0 includes improved performance, new UI components, and enhanced security features.')
    .setSeverity('info')
    .setPrimaryAction('Learn More', 'GET')
    .setSecondaryAction('Dismiss', 'POST');
```

### Message with Metadata

```javascript
const message = yeriaApp
    .createMessageView('custom-message', 'Custom Message')
    .setBody('This message includes custom metadata.')
    .setSeverity('info')
    .setPrimaryAction('OK', 'POST')
    .setMetadata({
        category: 'system',
        priority: 'high',
        timestamp: new Date().toISOString()
    });
```

### Message with Different HTTP Methods

```javascript
const message = yeriaApp
    .createMessageView('update-available', 'Update Available')
    .setBody('A new version is available. Would you like to update now?')
    .setSeverity('info')
    .setPrimaryAction('Update', 'PUT')
    .setSecondaryAction('Later', 'POST');
```

### Message Using submitButton (Alias)

```javascript
const message = yeriaApp
    .createMessageView('info', 'Information')
    .setBody('This uses the submitButton alias method.')
    .setSeverity('info')
    .submitButton('OK', 'POST');  // Alias for setPrimaryAction
```

### Message Clearing Secondary Action

```javascript
const message = yeriaApp
    .createMessageView('message', 'Message')
    .setBody('This message initially has two actions.')
    .setSeverity('info')
    .setPrimaryAction('Confirm', 'POST')
    .setSecondaryAction('Cancel', 'POST')
    .clearSecondaryAction();  // Remove secondary action
```

### Message in Process Workflow

```javascript
const message = yeriaApp
    .createMessageView('step-complete', 'Step Complete')
    .setProcess('onboarding', {
        processName: 'User Onboarding',
        currentStep: 2,
        totalSteps: 3,
        stepName: 'Verification'
    })
    .setBody('Your email has been verified successfully.')
    .setSeverity('success')
    .setPrimaryAction('Continue to Next Step', 'POST');
```

## Complete JSON Example

```json
{
  "id": "welcome-message",
  "type": "Message",
  "content": {
    "title": "Welcome!",
    "intro": "Thank you for joining us",
    "body": "We're excited to have you on board. Get started by completing your profile.",
    "severity": "info",
    "confirm": {
      "text": "Get Started",
      "method": "POST",
      "variant": "primary"
    },
    "cancel": {
      "text": "Maybe Later",
      "method": "POST",
      "variant": "secondary"
    },
    "dismissible": true,
    "meta": {
      "campaign": "onboarding-2025"
    }
  },
  "process": {
    "processId": "onboarding",
    "processName": "User Onboarding",
    "currentStep": 1,
    "totalSteps": 3,
    "stepName": "Welcome"
  },
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2025-01-28T10:00:00.000Z"
  }
}
```

