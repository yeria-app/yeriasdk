import { BaseView } from './base-view';
import {
    // BaseViewConfig,
    FormFieldParams,
    SubmitAction,
    FieldValidation,
    ValidationResult,
    HttpMethod
} from '../types';
import { FieldValidator, FormValidator } from '../utils/validators';
import {
    MissingRequiredParameterError,
    FieldValidationError,
    FieldNotFoundError,
    EmptyCollectionError,
    Result,
    Ok,
    Err
} from '../errors';

export interface FormContent {
    title: string;
    intro?: string;
    submit?: SubmitAction;
    fields: Array<FormFieldParams & { fieldType: string; fieldId: string; fieldLabel: string }>;
}

/**
 * Builds a Form SGUI view — an interactive data-entry form.
 *
 * Fields are appended via `addField` and the typed helpers (`addTextField`,
 * `addEmailField`, `addSelectField`, `addPhotoField`, `addGPSField`, ...);
 * `submitButton`/`updateButton`/`deleteButton` define the submit action, and
 * `injectData`/`setFieldValue` pre-fill existing fields.
 *
 * Extends {@link BaseView}; instantiated by the YeriaApp/YeriaUI factory,
 * populated with these builders, then serialized to a JSON view description and
 * signed into a v3 envelope by `serve()`.
 */
export class FormView extends BaseView {

    static fromJson(json: Record<string, unknown>): FormView {
        return FormView.fromJsonAs(FormView, 'Form', json);
    }
    private fieldValidations: Map<string, FieldValidation> = new Map();

    constructor(formId: string, title: string, processId?: string) {
        super({
            id: formId,
            type: 'Form',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            intro: '',
            submit: undefined,
            fields: []
        } as FormContent;
    }

    /**
     * Sets the form introduction (like ActionList/ActionGrid/etc.)
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Helper method to associate this form with a process
     * @param processId - Process identifier
     * @param options - Process options (name, steps, etc.)
     */
    belongsToProcess(
        processId: string,
        options?: {
            processName?: string;
            currentStep?: number;
            totalSteps?: number;
            stepName?: string;
            canGoBack?: boolean;
            canSkip?: boolean;
        }
    ): this {
        this.setProcess(processId, options);
        return this;
    }

    /**
     * Adds a field with validation
     */
    addField(
        fieldType: string,
        fieldId: string,
        fieldLabel: string,
        params?: FormFieldParams
    ): this {
        if (!fieldId || !fieldLabel || !fieldType) {
            throw new MissingRequiredParameterError('fieldId, fieldLabel, and fieldType');
        }

        // Field validation
        const validation = FieldValidator.validateField(fieldType, fieldId, fieldLabel, params);
        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message);
            throw new FieldValidationError(fieldId, fieldType, errorMessages);
        }

        const field = { fieldType, fieldId, fieldLabel, ...params };
        (this.content as FormContent).fields.push(field);

        // Store the validation for this field
        if (params) {
            this.fieldValidations.set(fieldId, params);
        }

        return this;
    }

    /**
     * Defines the submit button for the form
     * Convention: Mobile app POSTs to {service.baseUrl}/{formId}
     *
     * @param text - Button text (e.g., "Register", "Submit")
     * @param method - HTTP method (default: POST)
     * @param confirmMessage - Optional confirmation message for destructive actions
     */
    submitButton(text: string, method: HttpMethod = 'POST', confirmMessage?: string): this {
        (this.content as FormContent).submit = {
            text,
            method,
            confirmMessage
        };

        return this;
    }

    /**
     * Convenience method for update actions (PUT)
     */
    updateButton(text: string, confirmMessage?: string): this {
        return this.submitButton(text, 'PUT', confirmMessage);
    }

    /**
     * Convenience method for delete actions (DELETE with confirmation)
     */
    deleteButton(text: string, confirmMessage: string = 'Are you sure you want to delete this?'): this {
        return this.submitButton(text, 'DELETE', confirmMessage);
    }

    /**
     * Convenience methods for different field types
     */
    addTextField(fieldId: string, fieldLabel: string, isRequired: boolean = false, maxLength?: number): this {
        return this.addField('text', fieldId, fieldLabel, {
            required: isRequired,
            maxLength
        });
    }

    addEmailField(fieldId: string, fieldLabel: string, isRequired: boolean = false): this {
        return this.addField('email', fieldId, fieldLabel, {
            required: isRequired,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        });
    }

    addPasswordField(fieldId: string, fieldLabel: string, minLength: number = 8): this {
        return this.addField('password', fieldId, fieldLabel, {
            required: true,
            minLength
        });
    }

    addNumberField(fieldId: string, fieldLabel: string, isRequired: boolean = false, minVal?: number, maxVal?: number): this {
        return this.addField('number', fieldId, fieldLabel, {
            required: isRequired,
            min: minVal,
            max: maxVal
        });
    }

    addDateField(fieldId: string, fieldLabel: string, isRequired: boolean = false, minDate?: string, maxDate?: string): this {
        return this.addField('date', fieldId, fieldLabel, {
            required: isRequired,
            min: minDate ? new Date(minDate).getTime() : undefined,
            max: maxDate ? new Date(maxDate).getTime() : undefined
        });
    }

    addSelectField(fieldId: string, fieldLabel: string, isRequired: boolean = false, options: Array<{ label: string; value: unknown }>): this {
        if (!Array.isArray(options) || options.length === 0) {
            throw new EmptyCollectionError('Select field options', 'Select field must have at least one option');
        }

        return this.addField('select', fieldId, fieldLabel, {
            required: isRequired,
            options
        });
    }

    addPhotoField(fieldId: string, fieldLabel: string, isRequired: boolean = false, formats: string[] = ['jpeg', 'png'], live: boolean = false): this {
        if (!formats || formats.length === 0) {
            throw new EmptyCollectionError('Photo field formats', 'Photo field must specify at least one format');
        }

        const acceptedFormats = formats.map(format => `image/${format.toLowerCase()}`);
        return this.addField('photo', fieldId, fieldLabel, {
            required: isRequired,
            accept: acceptedFormats,
            live
        });
    }

    addFileField(fieldId: string, fieldLabel: string, isRequired: boolean = false, formats: string[]): this {
        if (!formats || formats.length === 0) {
            throw new EmptyCollectionError('File field formats', 'File field must specify at least one format');
        }

        return this.addField('file', fieldId, fieldLabel, {
            required: isRequired,
            accept: formats
        });
    }

    /**
     * @param config.altitude    include altitude in the captured value.
     * @param config.maxAccuracy the coarsest fix the provider accepts, in
     *   METRES (i.e. the minimum required precision). The mobile app keeps
     *   searching until `position.accuracy <= maxAccuracy`, and the captured
     *   accuracy travels back in the submitted value. Omit for the app default.
     * @param config.precision   legacy boolean high-accuracy flag — superseded
     *   by `maxAccuracy`; kept for backward compatibility.
     */
    addGPSField(
        fieldId: string,
        fieldLabel: string,
        isRequired: boolean = false,
        liveData: boolean = false,
        config: { altitude?: boolean; maxAccuracy?: number; precision?: boolean } = {}
    ): this {
        return this.addField('gps', fieldId, fieldLabel, {
            required: isRequired,
            live: liveData,
            ...config
        });
    }

    addPlusCodeField(fieldId: string, fieldLabel: string, isRequired: boolean = false, liveData: boolean = false): this {
        return this.addField('pluscode', fieldId, fieldLabel, {
            required: isRequired,
            live: liveData
        });
    }

    addHiddenField(fieldId: string, fieldLabel: string, value: string): this {
        return this.addField('hidden', fieldId, fieldLabel, { value });
    }

    addTextAreaField(fieldId: string, fieldLabel: string, isRequired: boolean = false, minLength?: number, maxLength?: number): this {
        return this.addField('textarea', fieldId, fieldLabel, {
            required: isRequired,
            minLength,
            maxLength
        });
    }

    addPhoneField(fieldId: string, fieldLabel: string, isRequired: boolean = false): this {
        return this.addField('phone', fieldId, fieldLabel, {
            required: isRequired,
            pattern: /^[\+]?[1-9][\d]{0,15}$/
        });
    }

    addURLField(fieldId: string, fieldLabel: string, isRequired: boolean = false): this {
        return this.addField('url', fieldId, fieldLabel, {
            required: isRequired
        });
    }

    addCheckboxField(fieldId: string, fieldLabel: string, isRequired: boolean = false): this {
        return this.addField('checkbox', fieldId, fieldLabel, {
            required: isRequired
        });
    }

    /**
     * Adds a visual separator to group form fields
     * Separators are rendered as gaps or lines by the mobile app renderer
     * @param fieldId - Optional field ID. If not provided, auto-generates a unique ID
     * @returns this for chaining
     * @example
     * form.addTextField('name', 'Name', true)
     *     .addSeparator()
     *     .addEmailField('email', 'Email', true);
     */
    addSeparator(fieldId?: string): this {
        const separatorId = fieldId || `separator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return this.addField('separator', separatorId, '', {});
    }

    /**
     * Injects data into the form's existing fields
     * Automatically handles fields with options (select, radio) using "selected"
     * @param data - Key-value object where key = fieldId
     * @returns Result with errors for fields not found
     * @example
     * const result = form.injectData({
     *   name: 'John Doe',
     *   email: 'john@example.com',
     *   country: 'FR'  // For select: sets selected: true on the 'FR' option
     * });
     * if (result.isErr()) {
     *   console.warn('Some fields not found:', result.error);
     * }
     */
    injectData(data: Record<string, unknown>): Result<void, string[]> {
        const errors: string[] = [];

        Object.entries(data).forEach(([fieldId, value]) => {
            const field = this.getField(fieldId);
            if (!field) {
                errors.push(`Field not found: ${fieldId}`);
                return;
            }

            // Automatic detection: fields with options (select, radio, checkbox with options)
            if (field.options && field.fieldType === 'select') {
                // For select: mark the matching option as selected
                const updatedOptions = field.options.map(opt => ({
                    ...opt,
                    selected: opt.value === value
                }));
                this.updateField(fieldId, { options: updatedOptions as any });
            }
            // Radio: a single value
            else if (field.options && field.fieldType === 'radio') {
                const updatedOptions = field.options.map(opt => ({
                    ...opt,
                    selected: opt.value === value
                }));
                this.updateField(fieldId, { options: updatedOptions as any });
            }
            // Checkbox with options: value is an array (multi-select)
            else if (field.options && field.fieldType === 'checkbox') {
                const selectedValues = Array.isArray(value) ? value : [value];
                const updatedOptions = field.options.map(opt => ({
                    ...opt,
                    selected: selectedValues.includes(opt.value)
                }));
                this.updateField(fieldId, { options: updatedOptions as any });
            }
            // Simple checkbox (true/false) or all other fields: use value
            else {
                this.updateField(fieldId, { value: value as any });
            }
        });

        if (errors.length > 0) {
            return Err(errors);
        }
        return Ok(undefined);
    }

    /**
     * Sets the value of a specific field
     * @param fieldId - Field ID
     * @param value - Value to inject
     * @example
     * form.setFieldValue('name', 'John Doe')
     */
    setFieldValue(fieldId: string, value: unknown): this {
        const field = this.getField(fieldId);
        if (!field) {
            throw new FieldNotFoundError(fieldId, this.id);
        }

        this.updateField(fieldId, { value: value as any });
        return this;
    }

    /**
     * Validates the form data
     * Note: This is for SDK internal validation. Services using this SDK should
     * perform their own data validation before populating views.
     */
    validateFormData(formData: Record<string, any>): ValidationResult {
        return FormValidator.validateFormData(formData, this.fieldValidations);
    }

    /**
     * Gets a field by its ID
     */
    getField(fieldId: string): (FormFieldParams & { fieldType: string; fieldId: string; fieldLabel: string }) | undefined {
        return (this.content as FormContent).fields.find(field => field.fieldId === fieldId);
    }

    /**
     * Removes a field by its ID
     * @returns Result with success or error message
     */
    removeField(fieldId: string): Result<void, string> {
        const fields = (this.content as FormContent).fields;
        const index = fields.findIndex(field => field.fieldId === fieldId);

        if (index !== -1) {
            fields.splice(index, 1);
            this.fieldValidations.delete(fieldId);
            return Ok(undefined);
        }

        return Err(`Field '${fieldId}' not found in form '${this.id}'`);
    }

    /**
     * Updates an existing field
     * @returns Result with success or error message
     */
    updateField(fieldId: string, updates: Partial<FormFieldParams>): Result<void, string> {
        const field = this.getField(fieldId);
        if (!field) {
            return Err(`Field '${fieldId}' not found in form '${this.id}'`);
        }

        Object.assign(field, updates);

        // Update the validation
        if (this.fieldValidations.has(fieldId)) {
            const existingValidation = this.fieldValidations.get(fieldId)!;
            this.fieldValidations.set(fieldId, { ...existingValidation, ...updates });
        }

        return Ok(undefined);
    }

    /**
     * Gets all fields
     */
    getFields(): Array<FormFieldParams & { fieldType: string; fieldId: string; fieldLabel: string }> {
        return [...(this.content as FormContent).fields];
    }

    /**
     * Gets the field count
     * @param excludeSeparators - If true, excludes separator fields from count (default: false)
     */
    getFieldCount(excludeSeparators: boolean = false): number {
        if (excludeSeparators) {
            return (this.content as FormContent).fields.filter(field => field.fieldType !== 'separator').length;
        }
        return (this.content as FormContent).fields.length;
    }

    /**
     * Checks whether the form has required fields
     */
    hasRequiredFields(): boolean {
        return (this.content as FormContent).fields.some(field => field.required);
    }

    /**
     * Gets the required fields
     */
    getRequiredFields(): string[] {
        return (this.content as FormContent).fields
            .filter(field => field.required)
            .map(field => field.fieldId);
    }
}
