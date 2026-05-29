import {
    BaseViewConfig,
    ViewType,
    ValidationResult,
    ViewState,
    NavigationConfig,
    ProcessContext,
    createValidationError
} from '../types';
import { ViewValidationError, NoProcessContextError, InvalidParameterError } from '../errors';
import { validateSubmissionURL, DEFAULT_URL_CONFIG } from '../utils/validators';

export abstract class BaseView {
    public readonly id: string;
    public readonly type: ViewType;
    public content: unknown;
    protected state: ViewState = {};
    protected metadata?: BaseViewConfig['metadata'];
    protected navigation?: NavigationConfig;
    protected processContext?: ProcessContext;

    constructor(config: BaseViewConfig) {
        this.id = config.id;
        this.type = config.type;
        this.metadata = config.metadata;
        // Initialize process context if processId provided
        if (config.processId) {
            this.processContext = {
                processId: config.processId
            };
        }
    }

    /**
     * Valide la vue avant de la servir
     */
    protected validate(): ValidationResult {
        const errors: ReturnType<typeof createValidationError>[] = [];
        const warnings: ReturnType<typeof createValidationError>[] = [];

        if (!this.id || this.id.trim() === '') {
            errors.push(createValidationError('View ID is required'));
        }

        if (!this.type) {
            errors.push(createValidationError('View type is required'));
        }

        if (!this.content) {
            errors.push(createValidationError('View content is required'));
        }

        // Validation spécifique par type de vue
        switch (this.type) {
            case 'Form':
                if (
                    !this.content ||
                    !Array.isArray((this.content as Record<string, unknown>)['fields']) ||
                    ((this.content as Record<string, unknown>)['fields'] as unknown[]).length === 0
                ) {
                    errors.push(createValidationError('Form must have at least one field'));
                } else {
                    // Exclude separator fields from "at least one field" validation
                    const fields = (this.content as Record<string, unknown>)['fields'] as Array<Record<string, unknown>>;
                    const nonSeparatorFields = fields.filter((f : any) => f.fieldType !== 'separator');
                    if (nonSeparatorFields.length === 0) {
                        errors.push(createValidationError('Form must have at least one non-separator field'));
                    }
                }
                break;

            case 'ActionList':
            case 'ActionGrid':
                if (
                    !this.content ||
                    !Array.isArray((this.content as Record<string, unknown>)['actions']) ||
                    ((this.content as Record<string, unknown>)['actions'] as unknown[]).length === 0
                ) {
                    errors.push(createValidationError('Action views must have at least one action'));
                }
                break;

            case 'Reader':
                if (typeof this.content === 'object' && this.content !== null) {
                    const readerContent = this.content as { title?: string; elements?: unknown[] };
                    if (!readerContent.title || !readerContent.title.trim()) {
                        errors.push(createValidationError('Reader view must have a title'));
                    }
                    if (!readerContent.elements || readerContent.elements.length === 0) {
                        errors.push(createValidationError('Reader view must contain at least one element'));
                    }
                }
                break;

            case 'Message':
                if (typeof this.content === 'object' && this.content !== null) {
                    const messageContent = this.content as {
                        body?: string;
                        intro?: string;
                        confirm?: unknown;
                    };

                    const hasBody = typeof messageContent.body === 'string' && messageContent.body.trim().length > 0;
                    const hasIntro = typeof messageContent.intro === 'string' && messageContent.intro.trim().length > 0;

                    if (!hasBody && !hasIntro) {
                        errors.push(createValidationError('Message view must define a body or an intro'));
                    }

                    if (!messageContent.confirm) {
                        errors.push(createValidationError('Message view must define a primary action'));
                    }
                } else {
                    errors.push(createValidationError('Message view content is invalid'));
                }
                break;

            case 'Card':
                if (typeof this.content === 'object' && this.content !== null) {
                    const card = this.content as { description?: string; stats?: unknown[]; sections?: unknown[] };
                    const hasDetail =
                        (typeof card.description === 'string' && card.description.trim().length > 0) ||
                        (Array.isArray(card.stats) && card.stats.length > 0) ||
                        (Array.isArray(card.sections) && card.sections.length > 0);

                    if (!hasDetail) {
                        errors.push(createValidationError('Card view requires at least a description, stat, or section'));
                    }
                } else {
                    errors.push(createValidationError('Card view content is invalid'));
                }
                break;

            case 'Carousel':
                if (
                    !this.content ||
                    !Array.isArray((this.content as Record<string, unknown>)['slides']) ||
                    ((this.content as Record<string, unknown>)['slides'] as unknown[]).length === 0
                ) {
                    errors.push(createValidationError('Carousel view must contain at least one slide'));
                }
                break;

            case 'Timeline':
                if (
                    !this.content ||
                    !Array.isArray((this.content as Record<string, unknown>)['items']) ||
                    ((this.content as Record<string, unknown>)['items'] as unknown[]).length === 0
                ) {
                    errors.push(createValidationError('Timeline view must contain at least one entry'));
                }
                break;

            case 'Media':
                if (
                    !this.content ||
                    !Array.isArray((this.content as Record<string, unknown>)['items']) ||
                    ((this.content as Record<string, unknown>)['items'] as unknown[]).length === 0
                ) {
                    errors.push(createValidationError('Media view must contain at least one resource'));
                }
                break;

            case 'Map': {
                if (!this.content || typeof this.content !== 'object') {
                    errors.push(createValidationError('Map view content is required'));
                    break;
                }
                const mc = this.content as Record<string, unknown>;
                const layers = Array.isArray(mc['layers']) ? (mc['layers'] as Array<Record<string, unknown>>) : [];

                // unique layer ids
                const seenLayerIds = new Set<string>();
                for (const l of layers) {
                    const id = l?.['id'];
                    if (typeof id !== 'string' || !id.trim()) {
                        errors.push(createValidationError('Map layer must have a non-empty id'));
                    } else if (seenLayerIds.has(id)) {
                        errors.push(createValidationError(`Duplicate map layer id: "${id}"`));
                    } else {
                        seenLayerIds.add(id);
                    }
                }

                const mode = mc['mode'] === 'pick' ? 'pick' : 'view';

                if (mode === 'pick') {
                    const pick = mc['pick'] as Record<string, unknown> | undefined;
                    if (!pick || typeof pick['submitUrl'] !== 'string' || !(pick['submitUrl'] as string).trim()) {
                        errors.push(createValidationError('Map pick mode requires pick.submitUrl'));
                    }
                } else {
                    // view mode: needs at least one drawable layer OR an emptyMessage
                    const hasDrawable = layers.some((l) => {
                        if (l?.['visible'] === false) return false;
                        const t = l?.['type'];
                        if (t === 'markers') return Array.isArray(l['markers']) && (l['markers'] as unknown[]).length > 0;
                        if (t === 'shapes')  return Array.isArray(l['shapes'])  && (l['shapes']  as unknown[]).length > 0;
                        if (t === 'heatmap') return Array.isArray(l['points'])  && (l['points']  as unknown[]).length > 0;
                        if (t === 'tiles')   return typeof l['url'] === 'string';
                        if (t === 'geojson') return !!l['data'];
                        return false;
                    });
                    const emptyMsg = mc['emptyMessage'];
                    const hasEmptyMessage = typeof emptyMsg === 'string' && (emptyMsg as string).trim().length > 0;
                    if (!hasDrawable && !hasEmptyMessage) {
                        errors.push(createValidationError('Map view must contain at least one drawable layer or an emptyMessage'));
                    }
                }
                break;
            }

            case 'QRDisplay':
                if (
                    !this.content ||
                    !(this.content as Record<string, unknown>)['qrImage'] ||
                    !(this.content as Record<string, unknown>)['qrTitle'] ||
                    !(this.content as Record<string, unknown>)['qrDescription']
                ) {
                    errors.push(createValidationError('QRDisplay view must have a QR code with image, title, and description'));
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Sert la vue avec validation
     */
    serve(): Record<string, unknown> {
        const validation = this.validate();

        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message);
            throw new ViewValidationError(this.id, this.type, errorMessages);
        }

        // Warnings are available in validation result for users to handle

        const result: Record<string, unknown> = {
            id: this.id,
            type: this.type,
            content: this.content,
        };

        // Ajouter le contexte de processus si présent (mobile app needs this for URL construction)
        if (this.processContext) {
            result['process'] = this.processContext;
        }

        // Ajouter les métadonnées si présentes
        if (this.metadata) {
            result['metadata'] = this.metadata;
        }

        // Ajouter l'état si présent
        if (Object.keys(this.state).length > 0) {
            result['state'] = this.state;
        }

        // Ajouter la navigation si présente
        if (this.navigation) {
            result['nav'] = this.navigation;
        }

        return result;
    }

    /**
     * Retourne la représentation JSON de la vue
     */
    toJSON(): Record<string, unknown> {
        return this.serve();
    }

    /**
     * Met à jour l'état de la vue
     */
    setState(key: string, value: unknown): void {
        this.state[key] = value;
    }

    /**
     * Obtient une valeur de l'état
     */
    getState(key: string): unknown {
        return this.state[key];
    }

    /**
     * Clone la vue
     * Uses structuredClone for efficient deep cloning when available, falls back to JSON serialization
     */
    clone(): this {
        const cloned = Object.create(Object.getPrototypeOf(this));

        const clonedMetadata = this.metadata
            ? {
                ...this.metadata,
                createdAt: this.metadata.createdAt instanceof Date
                    ? new Date(this.metadata.createdAt.getTime())
                    : this.metadata.createdAt
            }
            : undefined;

        // Use structuredClone if available (Node 17+, modern browsers) for better performance
        // Falls back to JSON serialization for compatibility
        const cloneContent = typeof structuredClone !== 'undefined'
            ? structuredClone(this.content)
            : JSON.parse(JSON.stringify(this.content));
        
        const cloneState = typeof structuredClone !== 'undefined'
            ? structuredClone(this.state)
            : JSON.parse(JSON.stringify(this.state));

        Object.assign(cloned, {
            id: this.id,
            type: this.type,
            content: cloneContent,
            state: cloneState,
            metadata: clonedMetadata
        });

        cloned.navigation = this.navigation ? { ...this.navigation } : undefined;
        cloned.processContext = this.processContext ? { ...this.processContext } : undefined;

        return cloned;
    }

    /**
     * Vérifie si la vue est valide
     */
    isValid(): boolean {
        return this.validate().isValid;
    }

    /**
     * Valide la vue et retourne le résultat
     */
    validateView(): ValidationResult {
        return this.validate();
    }

    /**
     * Obtient les erreurs de validation
     */
    getValidationErrors(): string[] {
        return this.validate().errors.map(e => e.message);
    }

    /**
     * Obtient les avertissements de validation
     */
    getValidationWarnings(): string[] {
        return (this.validate().warnings || []).map(e => e.message);
    }

    /**
     * Met à jour les métadonnées
     */
    updateMetadata(metadata: Partial<BaseViewConfig['metadata']>): void {
        if (this.metadata) {
            this.metadata = { ...this.metadata, ...metadata };
        } else {
            this.metadata = metadata as BaseViewConfig['metadata'];
        }
    }

    /**
     * Obtient les métadonnées
     */
    getMetadata(): BaseViewConfig['metadata'] {
        return this.metadata;
    }

    /**
     * Protected helper to set intro/note text with strict validation
     * Child views can expose this as setIntro(), setNote(), etc.
     * @param fieldName - Name of the content field to set (e.g., 'intro', 'note')
     * @param value - Text value to set
     * @throws InvalidParameterError if value is empty or null
     */
    protected setIntroText(fieldName: string, value: string): this {
        if (!value || value.trim().length === 0) {
            throw new InvalidParameterError(fieldName, value, `${fieldName} text cannot be empty`);
        }

        const trimmedValue = value.trim();

        if (typeof this.content === 'object' && this.content !== null) {
            (this.content as Record<string, unknown>)[fieldName] = trimmedValue;
        }

        return this;
    }

    /**
     * Définit la vue suivante (navigation)
     * Validates URL to prevent open redirects and malicious links
     */
    setNext(url: string): this {
        // Validate URL for security
        const validation = validateSubmissionURL(url, {
            ...DEFAULT_URL_CONFIG,
            blockLocalhost: false,  // Allow localhost for development
            blockPrivateIPs: false   // Allow private IPs for development
        });

        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message).join('; ');
            throw new InvalidParameterError('url', url, `Invalid navigation URL: ${errorMessages}`);
        }

        if (!this.navigation) {
            this.navigation = {};
        }
        this.navigation.next = url;
        return this;
    }

    /**
     * Définit la vue précédente (navigation)
     * Validates URL to prevent open redirects and malicious links
     */
    setPrev(url: string): this {
        // Validate URL for security
        const validation = validateSubmissionURL(url, {
            ...DEFAULT_URL_CONFIG,
            blockLocalhost: false,  // Allow localhost for development
            blockPrivateIPs: false   // Allow private IPs for development
        });

        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message).join('; ');
            throw new InvalidParameterError('url', url, `Invalid navigation URL: ${errorMessages}`);
        }

        if (!this.navigation) {
            this.navigation = {};
        }
        this.navigation.prev = url;
        return this;
    }

    /**
     * Définit le contexte de processus pour cette vue
     * @param processId - Identifiant unique du processus
     * @param context - Contexte additionnel (étapes, nom, etc.)
     */
    setProcess(processId: string, context?: Partial<Omit<ProcessContext, 'processId'>>): this {
        this.processContext = {
            processId,
            ...(context || {})
        };

        return this;
    }

    /**
     * Obtient le contexte de processus
     */
    getProcessContext(): ProcessContext | undefined {
        return this.processContext;
    }

    /**
     * Obtient l'identifiant du processus (raccourci)
     */
    getProcessId(): string | undefined {
        return this.processContext?.processId;
    }

    /**
     * Vérifie si cette vue fait partie d'un processus
     */
    hasProcess(): boolean {
        return this.processContext !== undefined;
    }

    /**
     * Met à jour le contexte de processus
     */
    updateProcessContext(updates: Partial<ProcessContext>): this {
        if (!this.processContext) {
            throw new NoProcessContextError(this.id, 'update');
        }

        this.processContext = {
            ...this.processContext,
            ...updates
        };

        return this;
    }

    /**
     * Nettoie les ressources de la vue
     */
    destroy(): void {
        this.state = {};
    }
} 
