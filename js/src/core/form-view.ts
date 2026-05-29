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

export class FormView extends BaseView {
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
     * Définit l'introduction du formulaire
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Définit la note du formulaire
     * @deprecated Use setIntro() instead. This method is kept for backward compatibility.
     */
    setNote(note: string): this {
        return this.setIntro(note);
    }

    /**
     * Méthode helper pour associer ce formulaire à un processus
     * @param processId - Identifiant du processus
     * @param options - Options du processus (nom, étapes, etc.)
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
     * Ajoute un champ avec validation
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

        // Validation du champ
        const validation = FieldValidator.validateField(fieldType, fieldId, fieldLabel, params);
        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message);
            throw new FieldValidationError(fieldId, fieldType, errorMessages);
        }

        const field = { fieldType, fieldId, fieldLabel, ...params };
        (this.content as FormContent).fields.push(field);

        // Stocker la validation pour ce champ
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
     * Méthodes de commodité pour différents types de champs
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

    addGPSField(
        fieldId: string,
        fieldLabel: string,
        isRequired: boolean = false,
        liveData: boolean = false,
        config: { altitude?: boolean; precision?: boolean } = {}
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
     * Injecte des données dans les champs existants du formulaire
     * Gère automatiquement les champs avec options (select, radio) en utilisant "selected"
     * @param data - Objet clé-valeur où clé = fieldId
     * @returns Result with errors for fields not found
     * @example
     * const result = form.injectData({
     *   name: 'John Doe',
     *   email: 'john@example.com',
     *   country: 'FR'  // Pour select: met selected: true sur l'option 'FR'
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

            // Détection automatique: champs avec options (select, radio, checkbox avec options)
            if (field.options && field.fieldType === 'select') {
                // Pour select: marquer l'option correspondante comme selected
                const updatedOptions = field.options.map(opt => ({
                    ...opt,
                    selected: opt.value === value
                }));
                this.updateField(fieldId, { options: updatedOptions as any });
            }
            // Radio: une seule valeur
            else if (field.options && field.fieldType === 'radio') {
                const updatedOptions = field.options.map(opt => ({
                    ...opt,
                    selected: opt.value === value
                }));
                this.updateField(fieldId, { options: updatedOptions as any });
            }
            // Checkbox avec options: value est un array (multi-sélection)
            else if (field.options && field.fieldType === 'checkbox') {
                const selectedValues = Array.isArray(value) ? value : [value];
                const updatedOptions = field.options.map(opt => ({
                    ...opt,
                    selected: selectedValues.includes(opt.value)
                }));
                this.updateField(fieldId, { options: updatedOptions as any });
            }
            // Checkbox simple (true/false) ou tous les autres champs: utiliser value
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
     * Définit la valeur d'un champ spécifique
     * @param fieldId - ID du champ
     * @param value - Valeur à injecter
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
     * Valide les données du formulaire
     * Note: This is for SDK internal validation. Services using this SDK should
     * perform their own data validation before populating views.
     */
    validateFormData(formData: Record<string, any>): ValidationResult {
        return FormValidator.validateFormData(formData, this.fieldValidations);
    }

    /**
     * Obtient un champ par son ID
     */
    getField(fieldId: string): (FormFieldParams & { fieldType: string; fieldId: string; fieldLabel: string }) | undefined {
        return (this.content as FormContent).fields.find(field => field.fieldId === fieldId);
    }

    /**
     * Supprime un champ par son ID
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
     * Met à jour un champ existant
     * @returns Result with success or error message
     */
    updateField(fieldId: string, updates: Partial<FormFieldParams>): Result<void, string> {
        const field = this.getField(fieldId);
        if (!field) {
            return Err(`Field '${fieldId}' not found in form '${this.id}'`);
        }

        Object.assign(field, updates);

        // Mettre à jour la validation
        if (this.fieldValidations.has(fieldId)) {
            const existingValidation = this.fieldValidations.get(fieldId)!;
            this.fieldValidations.set(fieldId, { ...existingValidation, ...updates });
        }

        return Ok(undefined);
    }

    /**
     * Obtient tous les champs
     */
    getFields(): Array<FormFieldParams & { fieldType: string; fieldId: string; fieldLabel: string }> {
        return [...(this.content as FormContent).fields];
    }

    /**
     * Obtient le nombre de champs
     * @param excludeSeparators - If true, excludes separator fields from count (default: false)
     */
    getFieldCount(excludeSeparators: boolean = false): number {
        if (excludeSeparators) {
            return (this.content as FormContent).fields.filter(field => field.fieldType !== 'separator').length;
        }
        return (this.content as FormContent).fields.length;
    }

    /**
     * Vérifie si le formulaire a des champs requis
     */
    hasRequiredFields(): boolean {
        return (this.content as FormContent).fields.some(field => field.required);
    }

    /**
     * Obtient les champs requis
     */
    getRequiredFields(): string[] {
        return (this.content as FormContent).fields
            .filter(field => field.required)
            .map(field => field.fieldId);
    }
}
