/**
 * Tests for FormView separators.
 * Locks the contract that separators carry an optional (possibly empty) label,
 * are skipped by field validation, and are excluded from the
 * "at least one field" rule. Regression guard: addSeparator() previously threw
 * because addField() rejected the empty label before separator handling.
 */

import { FormView } from '../src/core/form-view';

describe('FormView - separators', () => {
    it('adds a separator with an auto-generated id and empty label', () => {
        const form = new FormView('test-form', 'Test Form');
        form.addTextField('name', 'Name');
        form.addSeparator();
        form.addEmailField('email', 'Email');

        const fields = (form.toJSON().content as any).fields;
        const separator = fields.find((f: any) => f.fieldType === 'separator');
        expect(separator).toBeDefined();
        expect(separator.fieldId).toMatch(/^separator-/);
        expect(separator.fieldLabel).toBe('');
    });

    it('accepts an explicit separator id and label', () => {
        const form = new FormView('test-form', 'Test Form');
        form.addTextField('name', 'Name');
        form.addSeparator('sep-1', 'Contact details');
        form.addEmailField('email', 'Email');

        const fields = (form.toJSON().content as any).fields;
        const separator = fields.find((f: any) => f.fieldId === 'sep-1');
        expect(separator.fieldType).toBe('separator');
        expect(separator.fieldLabel).toBe('Contact details');
    });

    it('excludes separators from getFieldCount when requested', () => {
        const form = new FormView('test-form', 'Test Form');
        form.addTextField('name', 'Name');
        form.addSeparator();
        form.addEmailField('email', 'Email');

        expect(form.getFieldCount()).toBe(3);
        expect(form.getFieldCount(true)).toBe(2);
    });

    it('rejects a form whose only field is a separator', () => {
        const form = new FormView('test-form', 'Test Form');
        form.addSeparator();
        form.submitButton('Send');

        expect(() => form.toJSON()).toThrow();
    });
});
