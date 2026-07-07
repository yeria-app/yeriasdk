import { FieldValidation, ValidationResult, FormFieldParams, ValidationError as ValidationErrorType, createValidationError } from '../types';

export class DataSanitizer {
    /**
     * Sanitizes user input to prevent injection attacks
     * @param input - String to sanitize
     * @param options - Sanitization options
     * @returns Sanitized string
     */
    static sanitizeInput(input: string, options: { allowHtml?: boolean } = {}): string {
        if (typeof input !== 'string') return '';

        let sanitized = input.trim();

        // Remove null bytes (can cause issues in C-based parsers)
        sanitized = sanitized.replace(/\0/g, '');

        // Normalize Unicode to prevent homograph attacks
        // NFD = Canonical Decomposition, then recompose to NFC
        sanitized = sanitized.normalize('NFC');

        // HTML encoding unless explicitly allowed
        if (!options.allowHtml) {
            sanitized = sanitized
                .replace(/&/g, '&amp;')   // Must be first
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }

        return sanitized;
    }

    static validateCoordinates(lat: number, lon: number): boolean {
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }

    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateURL(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static validatePhoneNumber(phone: string): boolean {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    static validateDate(dateString: string): boolean {
        // Validate ISO 8601 date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) return false;

        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
    }

    static validateNumber(value: unknown): boolean {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    static validatePlusCode(plusCode: string): boolean {
        // Plus Code format: 8 characters + separator + 2-3 characters (e.g., 8FVC9G8F+6W)
        const plusCodeRegex = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,3}$/;
        return plusCodeRegex.test(plusCode.replace(/\s/g, '').toUpperCase());
    }

    static validatePassword(password: string, minLength: number = 8): { valid: boolean; error?: string } {
        if (password.length < minLength) {
            return { valid: false, error: `Password must be at least ${minLength} characters long` };
        }

        // Check for at least one lowercase letter
        if (!/[a-z]/.test(password)) {
            return { valid: false, error: 'Password must contain at least one lowercase letter' };
        }

        // Check for at least one uppercase letter
        if (!/[A-Z]/.test(password)) {
            return { valid: false, error: 'Password must contain at least one uppercase letter' };
        }

        // Check for at least one digit
        if (!/\d/.test(password)) {
            return { valid: false, error: 'Password must contain at least one digit' };
        }

        return { valid: true };
    }
}

export class FieldValidator {
    static validateField(
        fieldType: string,
        fieldId: string,
        fieldLabel: string,
        params?: FormFieldParams
    ): ValidationResult {
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationErrorType[] = [];

        // Basic validation
        if (!fieldId || fieldId.trim() === '') {
            errors.push(createValidationError('Field ID is required', fieldId));
        }

        // Separator fields don't require a label
        if (fieldType !== 'separator' && (!fieldLabel || fieldLabel.trim() === '')) {
            errors.push(createValidationError('Field label is required', fieldId));
        }

        if (!fieldType || fieldType.trim() === '') {
            errors.push(createValidationError('Field type is required', fieldId));
        }

        // Skip validation rules for separator fields (they're visual elements only)
        if (fieldType === 'separator') {
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        }

        // Parameter validation
        if (params) {
            // Length validation
            if (params.minLength !== undefined && params.minLength < 0) {
                errors.push(createValidationError('minLength must be non-negative', fieldId));
            }

            if (params.maxLength !== undefined && params.maxLength < 0) {
                errors.push(createValidationError('maxLength must be non-negative', fieldId));
            }

            if (params.minLength !== undefined && params.maxLength !== undefined &&
                params.minLength > params.maxLength) {
                errors.push(createValidationError('minLength cannot be greater than maxLength', fieldId));
            }

            // Numeric value validation
            if (params.min !== undefined && params.max !== undefined &&
                params.min > params.max) {
                errors.push(createValidationError('min value cannot be greater than max value', fieldId));
            }

            // Option validation for select fields
            if (params.options && (!Array.isArray(params.options) || params.options.length === 0)) {
                errors.push(createValidationError('Options must be a non-empty array for select fields', fieldId));
            }

            // MIME type validation
            if (params.accept && (!Array.isArray(params.accept) || params.accept.length === 0)) {
                errors.push(createValidationError('Accept must be a non-empty array for file fields', fieldId));
            }

            // Dependency validation
            if (params.dependencies && (!Array.isArray(params.dependencies) ||
                params.dependencies.some(dep => !dep || dep.trim() === ''))) {
                errors.push(createValidationError('Dependencies must be a non-empty array of valid field IDs', fieldId));
            }
        }

        // Field-type-specific validation
        switch (fieldType) {
            case 'email':
                if (params?.value && !DataSanitizer.validateEmail(params.value)) {
                    errors.push(createValidationError('Invalid email format', fieldId));
                }
                break;

            case 'url':
                if (params?.value && !DataSanitizer.validateURL(params.value)) {
                    errors.push(createValidationError('Invalid URL format', fieldId));
                }
                break;

            case 'phone':
                if (params?.value && !DataSanitizer.validatePhoneNumber(params.value)) {
                    errors.push(createValidationError('Invalid phone number format', fieldId));
                }
                break;

            case 'gps':
                if (params?.value) {
                    try {
                        const coords = JSON.parse(params.value);
                        if (!DataSanitizer.validateCoordinates(coords.lat, coords.lon)) {
                            errors.push(createValidationError('Invalid GPS coordinates', fieldId));
                        }
                    } catch {
                        errors.push(createValidationError('Invalid GPS coordinates format', fieldId));
                    }
                }
                break;

            case 'password':
                if (params?.minLength !== undefined && params.minLength < 8) {
                    warnings.push(createValidationError('Password minimum length should be at least 8 characters for security', fieldId));
                }
                if (params?.value) {
                    const passwordResult = DataSanitizer.validatePassword(params.value, params?.minLength || 8);
                    if (!passwordResult.valid && passwordResult.error) {
                        errors.push(createValidationError(passwordResult.error, fieldId));
                    }
                }
                break;

            case 'number':
                if (params?.value !== undefined && !DataSanitizer.validateNumber(params.value)) {
                    errors.push(createValidationError('Invalid number value', fieldId));
                }
                if (params?.min !== undefined && !DataSanitizer.validateNumber(params.min)) {
                    errors.push(createValidationError('Invalid min value', fieldId));
                }
                if (params?.max !== undefined && !DataSanitizer.validateNumber(params.max)) {
                    errors.push(createValidationError('Invalid max value', fieldId));
                }
                break;

            case 'date':
                if (params?.value && typeof params.value === 'string' && !DataSanitizer.validateDate(params.value)) {
                    errors.push(createValidationError('Invalid date format (expected YYYY-MM-DD)', fieldId));
                }
                if (params?.minDate && typeof params.minDate === 'string' && !DataSanitizer.validateDate(params.minDate)) {
                    errors.push(createValidationError('Invalid minDate format (expected YYYY-MM-DD)', fieldId));
                }
                if (params?.maxDate && typeof params.maxDate === 'string' && !DataSanitizer.validateDate(params.maxDate)) {
                    errors.push(createValidationError('Invalid maxDate format (expected YYYY-MM-DD)', fieldId));
                }
                // Validate date range logic
                if (params?.minDate && params?.maxDate &&
                    typeof params.minDate === 'string' && typeof params.maxDate === 'string') {
                    const minDate = new Date(params.minDate);
                    const maxDate = new Date(params.maxDate);
                    if (minDate > maxDate) {
                        errors.push(createValidationError('minDate cannot be after maxDate', fieldId));
                    }
                }
                break;

            case 'pluscode':
                if (params?.value && typeof params.value === 'string' && !DataSanitizer.validatePlusCode(params.value)) {
                    errors.push(createValidationError('Invalid Plus Code format (expected format: 8FVC9G8F+6W)', fieldId));
                }
                break;

            case 'textarea':
                // Same validations as text field but with larger typical limits
                if (params?.maxLength && params.maxLength < 10) {
                    warnings.push(createValidationError('Textarea maxLength is very small, consider using text field instead', fieldId));
                }
                break;

            case 'checkbox':
                if (params?.value !== undefined && typeof params.value !== 'boolean') {
                    errors.push(createValidationError('Checkbox value must be boolean', fieldId));
                }
                break;

            case 'select':
                if (!params?.options || params.options.length === 0) {
                    errors.push(createValidationError('Select fields must have options', fieldId));
                }
                // Validate option structure
                if (params?.options && Array.isArray(params.options)) {
                    params.options.forEach((option, index) => {
                        if (!option || typeof option !== 'object') {
                            errors.push(createValidationError(`Option at index ${index} must be an object with label and value`, fieldId));
                        } else if (!('label' in option) || !('value' in option)) {
                            errors.push(createValidationError(`Option at index ${index} must have 'label' and 'value' properties`, fieldId));
                        }
                    });
                }
                break;

            case 'file':
            case 'photo':
                if (!params?.accept || params.accept.length === 0) {
                    errors.push(createValidationError('File fields must specify accepted types', fieldId));
                }
                // Validate file format specifications
                if (params?.accept && Array.isArray(params.accept)) {
                    params.accept.forEach((format, index) => {
                        if (typeof format !== 'string' || format.trim() === '') {
                            errors.push(createValidationError(`File format at index ${index} must be a non-empty string`, fieldId));
                        }
                    });
                }
                break;

            case 'hidden':
                // Hidden fields must have a value
                if (params?.value === undefined || params?.value === null) {
                    errors.push(createValidationError('Hidden fields must have a value', fieldId));
                }
                break;

            case 'text':
                // Basic text field validation is already handled in general params validation
                break;

            default:
                warnings.push(createValidationError(`Unknown field type: ${fieldType}`, fieldId));
        }

        // Warnings
        if (fieldId.length > 50) {
            warnings.push(createValidationError('Field ID is quite long, consider using a shorter identifier', fieldId));
        }

        if (fieldLabel.length > 100) {
            warnings.push(createValidationError('Field label is quite long, consider using a shorter label', fieldId));
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
}

export class FormValidator {
    static validateFormData(
        formData: Record<string, unknown>,
        fieldValidations: Map<string, FieldValidation>
    ): ValidationResult {
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationErrorType[] = [];

        for (const [fieldId, validation] of fieldValidations) {
            const value = formData[fieldId];

            // Required field validation
            if (validation.required && (value === undefined || value === null || value === '')) {
                errors.push(createValidationError(`Field '${fieldId}' is required`, fieldId));
                continue;
            }

            // Dependency validation
            if (validation.dependencies) {
                for (const dependency of validation.dependencies) {
                    if (!formData[dependency]) {
                        errors.push(createValidationError(
                            `Field '${fieldId}' depends on '${dependency}' which is not filled`,
                            fieldId
                        ));
                        break;
                    }
                }
            }

            // Conditional validation
            if (validation.conditional && !validation.conditional(formData)) {
                continue; // Skip validation if condition is not met
            }

            // Pattern validation
            if (validation.pattern && typeof value === 'string' && !validation.pattern.test(value)) {
                errors.push(createValidationError(`Field '${fieldId}' does not match required pattern`, fieldId));
            }

            // Length validation
            if (typeof value === 'string') {
                if (validation.minLength !== undefined && value.length < validation.minLength) {
                    errors.push(createValidationError(
                        `Field '${fieldId}' must be at least ${validation.minLength} characters long`,
                        fieldId
                    ));
                }

                if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                    errors.push(createValidationError(
                        `Field '${fieldId}' must be at most ${validation.maxLength} characters long`,
                        fieldId
                    ));
                }
            }

            // Numeric value validation
            if (typeof value === 'number') {
                if (validation.min !== undefined && value < validation.min) {
                    errors.push(createValidationError(`Field '${fieldId}' must be at least ${validation.min}`, fieldId));
                }

                if (validation.max !== undefined && value > validation.max) {
                    errors.push(createValidationError(`Field '${fieldId}' must be at most ${validation.max}`, fieldId));
                }
            }

            // Custom validation
            if (validation.customValidator) {
                try {
                    const result = validation.customValidator(value);
                    if (typeof result === 'string') {
                        errors.push(createValidationError(`Field '${fieldId}': ${result}`, fieldId));
                    } else if (!result) {
                        errors.push(createValidationError(`Field '${fieldId}' failed custom validation`, fieldId));
                    }
                } catch (error) {
                    errors.push(createValidationError(
                        `Field '${fieldId}' custom validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        fieldId
                    ));
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
}

/**
 * Configuration for secure URL validation
 */
export interface URLValidationConfig {
    allowedDomains?: string[];
    allowedProtocols?: string[];
    blockPrivateIPs?: boolean;
    blockLocalhost?: boolean;
    maxUrlLength?: number;
}

export interface NavigationTargetValidationOptions {
    allowRelative?: boolean;
    allowViewId?: boolean;
}

/**
 * Securely validates a submission URL
 */
export function validateSubmissionURL(url: string, config: URLValidationConfig = {}): ValidationResult {
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationErrorType[] = [];

    try {
        const urlObj = new URL(url);

        // 1. Length validation
        if (config.maxUrlLength && url.length > config.maxUrlLength) {
            errors.push(createValidationError(`URL too long (max ${config.maxUrlLength} characters)`));
        }

        // 2. Allowed protocol validation
        const allowedProtocols = config.allowedProtocols || ['https:', 'http:'];
        if (!allowedProtocols.includes(urlObj.protocol)) {
            errors.push(createValidationError(`Protocol '${urlObj.protocol}' not allowed. Allowed: ${allowedProtocols.join(', ')}`));
        }

        // 3. Block private IPs
        if (config.blockPrivateIPs !== false) {
            const hostname = urlObj.hostname;
            const privateIPPatterns = [
                /^10\./,
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
                /^192\.168\./,
                /^127\./,
                /^169\.254\./,
                /^fc00:/,
                /^fe80:/
            ];

            if (privateIPPatterns.some(pattern => pattern.test(hostname))) {
                errors.push(createValidationError('Private/local IP addresses are not allowed'));
            }
        }

        // 4. Block localhost
        if (config.blockLocalhost !== false) {
            if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
                errors.push(createValidationError('Localhost is not allowed'));
            }
        }

        // 5. Allowed domain validation
        if (config.allowedDomains && config.allowedDomains.length > 0) {
            const hostname = urlObj.hostname.toLowerCase();
            const isAllowed = config.allowedDomains.some(domain => {
                const allowedDomain = domain.toLowerCase();
                return hostname === allowedDomain || hostname.endsWith('.' + allowedDomain);
            });

            if (!isAllowed) {
                errors.push(createValidationError(`Domain '${hostname}' not in allowed list: ${config.allowedDomains.join(', ')}`));
            }
        }

        // 6. Dangerous port validation
        const dangerousPorts = [21, 22, 23, 25, 53, 80, 110, 143, 993, 995, 3306, 5432, 6379, 27017];
        if (urlObj.port && dangerousPorts.includes(parseInt(urlObj.port))) {
            warnings.push(createValidationError(`Using potentially dangerous port: ${urlObj.port}`));
        }

        // 7. Suspicious character validation
        const suspiciousPatterns = [
            /\.\./, // Directory traversal
            /javascript:/i, // JavaScript protocol
            /data:/i, // Data URLs
            /vbscript:/i, // VBScript protocol
            /file:/i // File protocol
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(url))) {
            errors.push(createValidationError('URL contains suspicious patterns'));
        }

    } catch (error) {
        errors.push(createValidationError('Invalid URL format'));
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

/**
 * Secure default configuration
 */
export const DEFAULT_URL_CONFIG: URLValidationConfig = {
    allowedProtocols: ['https:'],
    blockPrivateIPs: true,
    blockLocalhost: true,
    maxUrlLength: 2048
};

export function validateNavigationTarget(
    target: string,
    config: URLValidationConfig = {},
    options: NavigationTargetValidationOptions = {}
): ValidationResult {
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationErrorType[] = [];
    const trimmed = target.trim();

    if (!trimmed) {
        errors.push(createValidationError('Navigation target cannot be empty'));
        return { isValid: false, errors };
    }

    const effectiveConfig = {
        ...DEFAULT_URL_CONFIG,
        ...config
    };

    if (effectiveConfig.maxUrlLength && trimmed.length > effectiveConfig.maxUrlLength) {
        errors.push(createValidationError(`URL too long (max ${effectiveConfig.maxUrlLength} characters)`));
    }

    const suspiciousPatterns = [
        /\.\./,
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /[\u0000-\u001F\u007F]/,
    ];
    if (suspiciousPatterns.some(pattern => pattern.test(trimmed))) {
        errors.push(createValidationError('URL contains suspicious patterns'));
    }

    if (/\s/.test(trimmed)) {
        errors.push(createValidationError('Navigation target cannot contain whitespace'));
    }

    const absoluteLike = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
    if (absoluteLike) {
        const absoluteValidation = validateSubmissionURL(trimmed, effectiveConfig);
        return {
            isValid: errors.length === 0 && absoluteValidation.isValid,
            errors: [...errors, ...absoluteValidation.errors],
            warnings: absoluteValidation.warnings ?? (warnings.length > 0 ? warnings : undefined)
        };
    }

    if (trimmed.startsWith('//')) {
        errors.push(createValidationError('Protocol-relative URLs are not allowed'));
    }

    const relativeAllowed = options.allowRelative !== false;
    const viewIdAllowed = options.allowViewId === true;
    const looksLikePath = trimmed.startsWith('/') || trimmed.startsWith('?') || trimmed.startsWith('#') || trimmed.includes('/');
    const safeRelativeToken = /^[A-Za-z0-9._~\-]+$/.test(trimmed);
    const isAccepted =
        (relativeAllowed && looksLikePath) ||
        (viewIdAllowed && safeRelativeToken) ||
        (relativeAllowed && safeRelativeToken);

    if (!isAccepted) {
        errors.push(createValidationError('Navigation target must be an absolute https/http URL, a safe relative path, or an allowed viewId'));
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}
