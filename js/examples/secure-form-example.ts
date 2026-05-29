#!/usr/bin/env ts-node

/**
 * Secure FormView usage example.
 */

import { FormView } from '../src/index';

console.log('🔒 Secure FormView example\n');

try {
    // 1. Build a form and configure the submit button following YeriaApp conventions.
    const form = new FormView('user-profile', 'User Profile')
        .setNote('Required fields are marked with *')
        .addTextField('firstName', 'First Name', true, 50)
        .addTextField('lastName', 'Last Name', true, 50)
        .addEmailField('email', 'Email', true)
        .addPhoneField('phone', 'Phone Number', false)
        .addSelectField('role', 'Role', true, [
            { label: 'Administrator', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' }
        ])
        .submitButton('Save Profile', 'POST');

    console.log('✅ Form built successfully');

    // 2. Inspect the JSON payload that will be delivered to the mobile client.
    const json = form.toJSON();
    console.log('\n📄 JSON payload:');
    console.log(JSON.stringify(json, null, 2));

    console.log('\n🔘 Submit action metadata:');
    console.log((json.content as any).submit);

    // 3. Demonstrate validation helpers.
    const validData = {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        role: 'admin'
    };

    const invalidData = {
        firstName: '',
        lastName: 'Lovelace',
        email: 'not-an-email',
        role: 'unknown'
    };

    console.log('\n🧪 Validation results:');
    console.log('Valid payload:', form.validateFormData(validData));
    console.log('Invalid payload:', form.validateFormData(invalidData));

    console.log('\n🎉 Secure FormView example completed successfully');
} catch (error) {
    console.error('❌ Example failed:', error);
}
