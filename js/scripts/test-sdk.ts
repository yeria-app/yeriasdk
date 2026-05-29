#!/usr/bin/env ts-node

/**
 * Lightweight smoke tests for the YeriaApp SDK.
 * Run with: npm run test-sdk
 */

import {
    YeriaApp,
    ReaderView,
    Logger,
    DataSanitizer,
    FileFormatManager
} from '../src/index';

Logger.getInstance().setLogLevel('info');

function section(title: string): void {
    console.log(`\n${title}`);
    console.log('─'.repeat(title.length));
}

section('🧪 YeriaApp SDK smoke tests');

// Test 1 – YeriaApp lifecycle
section('Test 1: YeriaApp lifecycle and secure serving');
const yeriaApp = new YeriaApp({
    appId: 'sdk-test-app',
    viewExpirationMinutes: 15
});

console.log('✅ YeriaApp initialised');
console.log('🔑 Public key length:', yeriaApp.getPublicKey().length);

// Test 2 – FormView creation and validation
section('Test 2: FormView creation and validation');
const registrationForm = yeriaApp
    .createFormView('user-registration', 'User Registration')
    .setNote('Please fill in your information')
    .addTextField('firstName', 'First Name', true, 50)
    .addEmailField('email', 'Email Address', true)
    .addPasswordField('password', 'Password', 8)
    .addSelectField('role', 'Role', true, [
        { label: 'Administrator', value: 'admin' },
        { label: 'User', value: 'user' }
    ])
    .submitButton('Create Account', 'POST');

const validData = {
    firstName: 'Ada',
    email: 'ada@example.com',
    password: 'Secret123!',
    role: 'admin'
};

const invalidData = {
    firstName: '',
    email: 'invalid',
    password: 'short',
    role: 'unknown'
};

console.log('✅ Field count:', registrationForm.getFieldCount());
console.log('✅ Required fields:', registrationForm.getRequiredFields().join(', '));
console.log('✅ Valid data result:', registrationForm.validateFormData(validData));
console.log('✅ Invalid data result:', registrationForm.validateFormData(invalidData));

// Test 3 – Secure serve and verification
section('Test 3: Secure serve & verification');
const secureResponse = yeriaApp.serve(registrationForm);
console.log('✅ Secure response generated');
console.log('🔏 Signature (truncated):', secureResponse.signature.substring(0, 32) + '...');
console.log('⏰ Timestamp:', secureResponse.timestamp);
console.log('🆔 AppId:', secureResponse.appId);
console.log('🔍 Integrity check:', yeriaApp.verifyIntegrity(secureResponse));

// Test 4 – ReaderView basics
section('Test 4: ReaderView basics');
const reader = new ReaderView('welcome', 'Welcome to YeriaApp')
    .setIntro('Highlights')
    .addParagraph('YeriaApp lets you describe UI screens using JSON.')
    .addSubTitle('Features')
    .addListField([
        'Typed builders for common views',
        'Validation helpers',
        'Secure signatures with Ed25519'
    ]);

console.log('✅ ReaderView elements:', reader.getElementCount());
console.log('✅ Reader JSON:', JSON.stringify(reader.toJSON(), null, 2));

// Test 5 – Utility helpers
section('Test 5: Utilities');
const dirty = '<script>alert("XSS")</script>Hello';
console.log(`🧹 Sanitised input: "${DataSanitizer.sanitizeInput(dirty)}"`);

const formatManager = FileFormatManager.getInstance();
console.log('📄 Supported PDF MIME:', formatManager.getMimeType('pdf'));
console.log('🎯 Image MIME list:', FileFormatManager.getMimeTypes(['png', 'jpeg']));

section('Summary');
console.log('\n✅ Smoke tests finished\n');
