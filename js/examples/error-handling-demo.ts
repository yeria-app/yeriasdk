#!/usr/bin/env ts-node

/**
 * Error handling demonstration - shows structured error types
 */

import { generateKeyPairSync } from 'crypto';
import {
    YeriaApp,
    FormView,
    // Error types
    YeriaAppError,
    FieldValidationError,
    FieldNotFoundError,
    InvalidParameterError,
    EmptyCollectionError,
    // Helpers
    isYeriaAppError,
    getErrorCode,
    ERROR_CODES
} from '../src/index';

function section(title: string): void {
    console.log(`\n${'='.repeat(70)}`);
    console.log(title);
    console.log('='.repeat(70));
}

section('🎯 Yeria SDK - Error Handling Demo');

// ===== Example 1: Custom Error Types =====
section('Example 1: Type-Safe Error Handling');

try {
    const form = new FormView('test', 'Test');

    // This will throw FieldValidationError
    form.addField('email', '', 'Email', { required: true });
} catch (error) {
    if (error instanceof FieldValidationError) {
        console.log('✅ Caught FieldValidationError');
        console.log('  Field ID:', error.fieldId);
        console.log('  Field Type:', error.fieldType);
        console.log('  Errors:', error.validationErrors);
        console.log('  Error Code:', error.code);
    }
}

// ===== Example 2: Missing Required Parameters =====
section('Example 2: Missing Required Parameters');

try {
    const form = new FormView('test', 'Test');

    // Will throw EmptyCollectionError
    form.addSelectField('role', 'Role', true, []);
} catch (error) {
    if (error instanceof EmptyCollectionError) {
        console.log('✅ Caught EmptyCollectionError');
        console.log('  Collection:', error.collectionName);
        console.log('  Constraint:', error.constraint);
        console.log('  Error Code:', error.code);
    }
}

// ===== Example 3: Field Not Found =====
section('Example 3: Field Not Found Error');

try {
    const form = new FormView('test', 'Test');
    form.addTextField('name', 'Name', true);

    // Will throw FieldNotFoundError
    form.setFieldValue('nonexistent', 'value');
} catch (error) {
    if (error instanceof FieldNotFoundError) {
        console.log('✅ Caught FieldNotFoundError');
        console.log('  Field ID:', error.fieldId);
        console.log('  Form ID:', error.formId);
        console.log('  Error Code:', error.code);
        console.log('  Message:', error.message);
    }
}

// ===== Example 4: Stateless Signing Helper =====
section('Example 4: Stateless Signing Helper');

const statelessForm = new FormView('stateless-form', 'Stateless Form');
statelessForm.addTextField('name', 'Name', true);
const payload = statelessForm.toJSON();
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
const signedPayload = YeriaApp.signView(payload, 'stateless-demo', privatePem);

console.log('✅ View signed statelessly');
console.log('  Signature:', signedPayload.signature.substring(0, 32) + '...');
console.log('  Timestamp:', new Date(signedPayload.timestamp).toISOString());
console.log('  Verification:', YeriaApp.verifySignature(publicPem, signedPayload) ? 'PASS' : 'FAIL');

// ===== Example 5: Result Type (Non-Throwing Operations) =====
section('Example 5: Result Type for Optional Operations');

const form = new FormView('test', 'Test');
form.addTextField('email', 'Email', true);

// Try to remove a field (returns Result instead of throwing)
const removeResult = form.removeField('email');
if (removeResult.ok) {
    console.log('✅ Field removed successfully');
} else {
    console.log('❌ Failed to remove field:', removeResult.error);
}

// Try to update non-existent field (returns Result)
const updateResult = form.updateField('nonexistent', { value: 'test' });
if (updateResult.ok) {
    console.log('✅ Field updated successfully');
} else {
    console.log('❌ Failed to update field:', updateResult.error);
}

// ===== Example 6: Structured Validation Errors =====
section('Example 6: Structured Validation Errors');

const registrationForm = new FormView('registration', 'Registration');
registrationForm
    .addTextField('name', 'Name', true)
    .addEmailField('email', 'Email', true)
    .addPasswordField('password', 'Password', 8);

const invalidData = {
    name: '',
    email: 'not-an-email',
    password: 'short'
};

const validation = registrationForm.validateFormData(invalidData);
console.log('Validation result:', validation.isValid);
console.log('Errors (structured):');
validation.errors.forEach(error => {
    console.log('  - Field:', error.field || 'N/A');
    console.log('    Message:', error.message);
    if (error.code) console.log('    Code:', error.code);
});

// ===== Example 7: Error Code Checking =====
section('Example 7: Error Code Checking');

try {
    const form2 = new FormView('test', 'Test');
    form2.addTextField('name', 'Name', true);
    form2.setFieldValue('missing', 'value');
} catch (error) {
    const code = getErrorCode(error);
    console.log('Error code:', code);

    if (code === ERROR_CODES.FIELD_NOT_FOUND) {
        console.log('✅ Programmatically handled FIELD_NOT_FOUND error');
    }
}

// ===== Example 8: Error Helper Functions =====
section('Example 8: Error Helper Functions');

try {
    throw new InvalidParameterError('columns', 10, 'Must be between 1-6');
} catch (error) {
    console.log('Is YeriaAppError?', isYeriaAppError(error));
    console.log('Error code:', getErrorCode(error));
    console.log('Error details:', (error as YeriaAppError).details);
}

// ===== Example 9: Error JSON Serialization =====
section('Example 9: Error JSON Serialization (for API responses)');

try {
    const form3 = new FormView('test', 'Test');
    form3.addSelectField('role', 'Role', true, []);  // Empty options
} catch (error) {
    if (isYeriaAppError(error)) {
        console.log('Error as JSON:');
        console.log(JSON.stringify(error.toJSON(), null, 2));
    }
}

// ===== Summary =====
section('📋 Summary');

console.log(`
✅ Custom Error Types:
   - Type-safe catch blocks (instanceof checks)
   - Structured error data (fieldId, code, details)
   - Error codes for programmatic handling

✅ Result Type:
   - Non-throwing operations return Result<T, E>
   - Clear success/failure with error context
   - { ok: true, value } or { ok: false, error }

✅ Structured ValidationResult:
   - errors: ValidationError[] with field, message, code
   - warnings: ValidationError[]
   - Easy to display in UI

✅ Error Helpers:
   - isYeriaAppError() - type guard
   - getErrorCode() - extract code safely
   - getErrorMessage() - extract message safely

🎯 Benefits:
   - Better developer experience
   - Type-safe error handling
   - Programmatic error detection
   - API-friendly error responses
`);

console.log('\n🎉 Error handling demo completed!\n');

