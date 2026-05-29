# FormView Component Specification

## Description

The `FormView` component is used to create dynamic forms with various field types, validation rules, and submission actions. It supports a wide range of input types including text, email, password, number, date, select, file uploads, GPS coordinates, and more.

Forms follow a convention-based submission pattern where the mobile app POSTs form data to `{service.baseUrl}/{formId}`.

## Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the form view |
| `type` | `string` | Yes | Always `"Form"` |
| `content` | `FormContent` | Yes | Form content object |
| `content.title` | `string` | Yes | Form title displayed to the user |
| `content.intro` | `string` | No | Optional introduction/instructions shown above fields |
| `content.submit` | `SubmitAction` | No | Submit button configuration |
| `content.submit.text` | `string` | Yes* | Button text (required if submit is set) |
| `content.submit.method` | `HttpMethod` | No | HTTP method (default: `"POST"`) |
| `content.submit.confirmMessage` | `string` | No | Optional confirmation dialog message |
| `content.fields` | `FormField[]` | Yes | Array of form fields (at least one non-separator field required) |
| `content.fields[].fieldType` | `string` | Yes | Field type: `"text"`, `"email"`, `"password"`, `"number"`, `"date"`, `"select"`, `"photo"`, `"file"`, `"gps"`, `"pluscode"`, `"hidden"`, `"textarea"`, `"phone"`, `"url"`, `"checkbox"`, `"separator"` |
| `content.fields[].fieldId` | `string` | Yes | Unique identifier for the field |
| `content.fields[].fieldLabel` | `string` | Yes | Display label for the field |
| `content.fields[].value` | `unknown` | No | Default/pre-filled value |
| `content.fields[].required` | `boolean` | No | Whether the field is required |
| `content.fields[].placeholder` | `string` | No | Placeholder text |
| `content.fields[].helpText` | `string` | No | Help text shown below the field |
| `content.fields[].disabled` | `boolean` | No | Whether the field is disabled |
| `content.fields[].readonly` | `boolean` | No | Whether the field is read-only |
| `content.fields[].min` | `number` | No | Minimum value (for number/date fields) |
| `content.fields[].max` | `number` | No | Maximum value (for number/date fields) |
| `content.fields[].minLength` | `number` | No | Minimum string length |
| `content.fields[].maxLength` | `number` | No | Maximum string length |
| `content.fields[].pattern` | `RegExp` | No | Validation regex pattern |
| `content.fields[].options` | `Array<{label: string, value: unknown, selected?: boolean}>` | No | Options for select/radio/checkbox fields |
| `content.fields[].accept` | `string[]` | No | Accepted file types (MIME types) |
| `content.fields[].live` | `boolean` | No | Enable live updates (for GPS/photo fields) |
| `content.fields[].minDate` | `string` | No | Minimum date (YYYY-MM-DD format) |
| `content.fields[].maxDate` | `string` | No | Maximum date (YYYY-MM-DD format) |
| `processId` | `string` | No | Process identifier for multi-step workflows |
| `metadata` | `object` | No | View metadata (version, createdAt, author, tags) |

## Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setIntro(intro: string)` | `intro` - Introduction text | `this` | Sets the introduction text displayed above form fields |
| `setNote(note: string)` | `note` - Note text | `this` | **Deprecated.** Use `setIntro()` instead. Kept for backward compatibility |
| `belongsToProcess(processId, options?)` | `processId` - Process ID<br>`options` - Process options (processName, currentStep, totalSteps, stepName, canGoBack, canSkip) | `this` | Associates form with a multi-step process workflow |
| `addField(fieldType, fieldId, fieldLabel, params?)` | `fieldType` - Field type<br>`fieldId` - Unique field ID<br>`fieldLabel` - Display label<br>`params` - Field parameters | `this` | Adds a field with validation |
| `submitButton(text, method?, confirmMessage?)` | `text` - Button text<br>`method` - HTTP method (default: POST)<br>`confirmMessage` - Optional confirmation | `this` | Defines the submit button |
| `updateButton(text, confirmMessage?)` | `text` - Button text<br>`confirmMessage` - Optional confirmation | `this` | Convenience method for PUT operations |
| `deleteButton(text, confirmMessage?)` | `text` - Button text<br>`confirmMessage` - Confirmation message | `this` | Convenience method for DELETE operations |
| `addTextField(fieldId, fieldLabel, isRequired?, maxLength?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`maxLength` - Max length | `this` | Adds a text input field |
| `addEmailField(fieldId, fieldLabel, isRequired?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag | `this` | Adds an email input field |
| `addPasswordField(fieldId, fieldLabel, minLength?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`minLength` - Minimum length (default: 8) | `this` | Adds a password field |
| `addNumberField(fieldId, fieldLabel, isRequired?, minVal?, maxVal?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`minVal` - Minimum value<br>`maxVal` - Maximum value | `this` | Adds a number input field |
| `addDateField(fieldId, fieldLabel, isRequired?, minDate?, maxDate?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`minDate` - Min date (YYYY-MM-DD)<br>`maxDate` - Max date (YYYY-MM-DD) | `this` | Adds a date input field |
| `addSelectField(fieldId, fieldLabel, isRequired?, options)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`options` - Array of {label, value} | `this` | Adds a select dropdown field |
| `addPhotoField(fieldId, fieldLabel, isRequired?, formats?, live?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`formats` - Accepted formats (default: ['jpeg', 'png'])<br>`live` - Live updates | `this` | Adds a photo upload field |
| `addFileField(fieldId, fieldLabel, isRequired?, formats)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`formats` - MIME types array | `this` | Adds a file upload field |
| `addGPSField(fieldId, fieldLabel, isRequired?, liveData?, config?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`liveData` - Live updates<br>`config` - GPS config (altitude, precision) | `this` | Adds a GPS location field |
| `addPlusCodeField(fieldId, fieldLabel, isRequired?, liveData?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`liveData` - Live updates | `this` | Adds a Plus Code field |
| `addHiddenField(fieldId, fieldLabel, value)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`value` - Field value | `this` | Adds a hidden field |
| `addTextAreaField(fieldId, fieldLabel, isRequired?, minLength?, maxLength?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag<br>`minLength` - Min length<br>`maxLength` - Max length | `this` | Adds a textarea field |
| `addPhoneField(fieldId, fieldLabel, isRequired?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag | `this` | Adds a phone number field |
| `addURLField(fieldId, fieldLabel, isRequired?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag | `this` | Adds a URL field |
| `addCheckboxField(fieldId, fieldLabel, isRequired?)` | `fieldId` - Field ID<br>`fieldLabel` - Label<br>`isRequired` - Required flag | `this` | Adds a checkbox field |
| `addSeparator(fieldId?)` | `fieldId` - Optional field ID (auto-generated if not provided) | `this` | Adds a visual separator to group form fields (rendered as gap or line) |
| `injectData(data)` | `data` - Object with fieldId-value pairs | `Result<void, string[]>` | Injects data into existing fields (handles select options automatically) |
| `setFieldValue(fieldId, value)` | `fieldId` - Field ID<br>`value` - Value to set | `this` | Sets the value of a specific field |
| `validateFormData(formData)` | `formData` - Form data object | `ValidationResult` | Validates form data against field validations |
| `getField(fieldId)` | `fieldId` - Field ID | `FormField \| undefined` | Gets a field by ID |
| `removeField(fieldId)` | `fieldId` - Field ID | `Result<void, string>` | Removes a field by ID |
| `updateField(fieldId, updates)` | `fieldId` - Field ID<br>`updates` - Partial field updates | `Result<void, string>` | Updates an existing field |
| `getFields()` | - | `FormField[]` | Gets all fields |
| `getFieldCount(excludeSeparators?)` | `excludeSeparators` - Exclude separator fields (default: false) | `number` | Gets the number of fields (optionally excluding separators) |
| `hasRequiredFields()` | - | `boolean` | Checks if form has required fields |
| `getRequiredFields()` | - | `string[]` | Gets array of required field IDs |
| `serve()` | - | `Record<string, unknown>` | Serves the view with validation (inherited from BaseView) |
| `toJSON()` | - | `Record<string, unknown>` | Returns JSON representation (inherited from BaseView) |
| `setState(key, value)` | `key` - State key<br>`value` - State value | `void` | Sets view state (inherited from BaseView) |
| `getState(key)` | `key` - State key | `unknown` | Gets view state (inherited from BaseView) |
| `setNext(url)` | `url` - Next view URL | `this` | Sets next view navigation (inherited from BaseView) |
| `setPrev(url)` | `url` - Previous view URL | `this` | Sets previous view navigation (inherited from BaseView) |
| `setProcess(processId, context?)` | `processId` - Process ID<br>`context` - Process context | `this` | Sets process context (inherited from BaseView) |

## JavaScript Sample Code

### Basic Form

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

const yeriaApp = new YeriaApp({ appId: 'my-app' });

const form = yeriaApp
    .createFormView('user-registration', 'User Registration')
    .setIntro('Please fill in all required fields')
    .addTextField('firstName', 'First Name', true, 50)
    .addTextField('lastName', 'Last Name', true, 50)
    .addEmailField('email', 'Email Address', true)
    .addPhoneField('phone', 'Phone Number', false)
    .submitButton('Create Account', 'POST');

const response = yeriaApp.serve(form);
```

### Form with Select Field

```javascript
const form = yeriaApp
    .createFormView('survey', 'Customer Survey')
    .addSelectField('country', 'Country', true, [
        { label: 'France', value: 'FR' },
        { label: 'Canada', value: 'CA' },
        { label: 'Belgium', value: 'BE' }
    ])
    .addSelectField('rating', 'Rating', true, [
        { label: 'Excellent', value: 5 },
        { label: 'Good', value: 4 },
        { label: 'Average', value: 3 },
        { label: 'Poor', value: 2 },
        { label: 'Very Poor', value: 1 }
    ])
    .submitButton('Submit Survey', 'POST');
```

### Form with File Upload

```javascript
const form = yeriaApp
    .createFormView('document-upload', 'Upload Document')
    .addFileField('document', 'Document', true, [
        'application/pdf',
        'image/jpeg',
        'image/png'
    ])
    .addPhotoField('photo', 'Profile Photo', false, ['jpeg', 'png'], true)
    .submitButton('Upload', 'POST');
```

### Form with GPS Field

```javascript
const form = yeriaApp
    .createFormView('location-form', 'Record Location')
    .addGPSField('location', 'Your Location', true, true, {
        altitude: true,
        precision: true
    })
    .addPlusCodeField('pluscode', 'Plus Code', false, true)
    .submitButton('Save Location', 'POST');
```

### Form with Date Field

```javascript
const form = yeriaApp
    .createFormView('appointment', 'Schedule Appointment')
    .addDateField('appointmentDate', 'Appointment Date', true, '2025-01-01', '2025-12-31')
    .addTextField('notes', 'Additional Notes', false)
    .submitButton('Book Appointment', 'POST');
```

### Form with Pre-filled Data

```javascript
const form = yeriaApp
    .createFormView('edit-profile', 'Edit Profile')
    .addTextField('name', 'Full Name', true)
    .addEmailField('email', 'Email', true)
    .addSelectField('country', 'Country', false, [
        { label: 'France', value: 'FR' },
        { label: 'Canada', value: 'CA' }
    ]);

// Inject pre-filled data
form.injectData({
    name: 'John Doe',
    email: 'john@example.com',
    country: 'FR'  // Automatically selects the option with value 'FR'
});

form.submitButton('Update Profile', 'PUT');
```

### Form with Validation

```javascript
const form = yeriaApp
    .createFormView('registration', 'Register')
    .addPasswordField('password', 'Password', true, 8)
    .addTextField('username', 'Username', true)
    .addField('text', 'username', 'Username', {
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/
    })
    .submitButton('Register', 'POST');
```

### Form with Separators

```javascript
const form = yeriaApp
    .createFormView('registration', 'User Registration')
    .addTextField('firstName', 'First Name', true)
    .addTextField('lastName', 'Last Name', true)
    .addSeparator()  // Visual separator between sections
    .addEmailField('email', 'Email', true)
    .addPhoneField('phone', 'Phone', false)
    .addSeparator('billing-separator')  // With explicit ID
    .addTextField('address', 'Address', true)
    .addTextField('city', 'City', true)
    .submitButton('Register', 'POST');
```

**Note:** Separators are visual elements only and don't collect data. They are excluded from "at least one field" validation, so a form must have at least one non-separator field.

### Form in Process Workflow

```javascript
const form = yeriaApp
    .createFormView('step-1', 'Personal Information')
    .belongsToProcess('onboarding', {
        processName: 'User Onboarding',
        currentStep: 1,
        totalSteps: 3,
        stepName: 'Personal Info',
        canGoBack: false,
        canSkip: false
    })
    .addTextField('firstName', 'First Name', true)
    .addTextField('lastName', 'Last Name', true)
    .submitButton('Next', 'POST');
```

## Complete JSON Example

```json
{
  "id": "user-registration",
  "type": "Form",
  "content": {
    "title": "User Registration",
    "intro": "Please fill in your information to create an account",
    "submit": {
      "text": "Register",
      "method": "POST",
      "confirmMessage": "Are you sure you want to submit?"
    },
    "fields": [
      {
        "fieldType": "text",
        "fieldId": "firstName",
        "fieldLabel": "First Name",
        "required": true,
        "placeholder": "Enter your first name",
        "maxLength": 50,
        "helpText": "Your legal first name"
      },
      {
        "fieldType": "text",
        "fieldId": "lastName",
        "fieldLabel": "Last Name",
        "required": true,
        "placeholder": "Enter your last name",
        "maxLength": 50
      },
      {
        "fieldType": "separator",
        "fieldId": "separator-1234567890-1234",
        "fieldLabel": ""
      },
      {
        "fieldType": "email",
        "fieldId": "email",
        "fieldLabel": "Email Address",
        "required": true,
        "placeholder": "you@example.com",
        "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
      },
      {
        "fieldType": "phone",
        "fieldId": "phone",
        "fieldLabel": "Phone Number",
        "required": false,
        "placeholder": "+1234567890"
      },
      {
        "fieldType": "select",
        "fieldId": "country",
        "fieldLabel": "Country",
        "required": true,
        "options": [
          {
            "label": "France",
            "value": "FR",
            "selected": false
          },
          {
            "label": "United States",
            "value": "US",
            "selected": true
          },
          {
            "label": "Canada",
            "value": "CA",
            "selected": false
          }
        ]
      },
      {
        "fieldType": "date",
        "fieldId": "birthDate",
        "fieldLabel": "Date of Birth",
        "required": true,
        "minDate": "1900-01-01",
        "maxDate": "2010-12-31"
      },
      {
        "fieldType": "number",
        "fieldId": "age",
        "fieldLabel": "Age",
        "required": false,
        "min": 18,
        "max": 120,
        "value": 25
      }
    ]
  },
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2025-01-28T10:00:00.000Z"
  }
}
```

