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
import { validateNavigationTarget, DEFAULT_URL_CONFIG } from '../utils/validators';

/**
 * Abstract base for every Yeria SGUI view (Form, Reader, Card, Map, ...).
 *
 * Holds the state common to all views: identity (id / type / processId),
 * navigation (setNext / setPrev), metadata, and the serialization
 * (build / toJSON) that produces the view's JSON description. Concrete views
 * are created via the YeriaApp / YeriaUI factory methods, populated, then
 * signed by their serialized output. Instances are mutable, per-request
 * builders — not singletons.
 *
 * This class is ABSTRACT and is never instantiated directly; use a concrete
 * view subclass instead.
 */
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
     * Validates the view before serving it
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

        // View-type-specific validation
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
            case 'IconGrid':
                if (
                    !this.content ||
                    !Array.isArray((this.content as Record<string, unknown>)['actions']) ||
                    ((this.content as Record<string, unknown>)['actions'] as unknown[]).length === 0
                ) {
                    errors.push(createValidationError('Action views must have at least one action'));
                }
                if (this.type === 'IconGrid') {
                    const shape = (this.content as Record<string, unknown>)?.['shape'];
                    if (shape !== undefined && shape !== 'circle' && shape !== 'square') {
                        errors.push(createValidationError("IconGrid 'shape' must be 'circle' or 'square'"));
                    }
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
     * Validates the view, then returns its UNSIGNED JSON description (the wire
     * payload). This does NOT sign — signing is `app.serve(view)`, which calls
     * this internally. Named `build()` to avoid colliding with that.
     */
    build(): Record<string, unknown> {
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

        // Add the process context if present (mobile app needs this for URL construction)
        if (this.processContext) {
            result['process'] = this.processContext;
        }

        // Add the metadata if present
        if (this.metadata) {
            result['metadata'] = this.metadata;
        }

        // Add the state if present
        if (Object.keys(this.state).length > 0) {
            result['state'] = this.state;
        }

        // Add the navigation if present
        if (this.navigation) {
            result['nav'] = this.navigation;
        }

        return result;
    }

    /**
     * Returns the view's JSON description (delegates to build()).
     * Returns the JSON representation of the view
     */
    toJSON(): Record<string, unknown> {
        return this.build();
    }

    /**
     * Shared rehydration: reconstruct a typed view instance from a wire JSON
     * payload (the output of `toJSON()`), bypassing the fluent constructor.
     * Each concrete view exposes a thin `static fromJson(json)` that calls this
     * with its own class + expected type; the type guard is the per-view check,
     * and the reconstructed instance is run through `validate()` (the existing
     * per-type rules) before it is returned.
     *
     * All serialisable state lives in `content` (no view overrides `serve()`),
     * so restoring `content` + the common fields is faithful for re-serving.
     * Builder-only helpers (e.g. FormView's field-validation map) are not
     * restored — `serve()` does not use them.
     */
    static fromJsonAs<T extends BaseView>(
        Ctor: { prototype: T },
        expectedType: ViewType,
        json: Record<string, unknown>,
    ): T {
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
            throw new InvalidParameterError('json', json, 'fromJson expects a plain object view payload');
        }
        if (typeof json['id'] !== 'string' || (json['id'] as string).trim() === '') {
            throw new InvalidParameterError('id', json['id'], 'fromJson requires a non-empty string id');
        }
        if (json['type'] !== expectedType) {
            throw new InvalidParameterError('type', json['type'], `expected view type "${expectedType}", got "${String(json['type'])}"`);
        }
        if (!('content' in json) || json['content'] === null || json['content'] === undefined) {
            throw new InvalidParameterError('content', json['content'], 'fromJson requires content');
        }

        // Bypass the fluent constructor (like clone()) and restore fields.
        const instance: any = Object.create(Ctor.prototype);
        instance.id = json['id'];
        instance.type = json['type'];
        instance.content = json['content'];
        instance.state = (json['state'] && typeof json['state'] === 'object') ? json['state'] : {};
        instance.metadata = json['metadata'];
        instance.navigation = (json['nav'] && typeof json['nav'] === 'object') ? json['nav'] : undefined;
        instance.processContext = (json['process'] && typeof json['process'] === 'object') ? json['process'] : undefined;

        const validation = (instance as BaseView).validateView();
        if (!validation.isValid) {
            throw new ViewValidationError(
                (instance as BaseView).id,
                (instance as BaseView).type,
                validation.errors.map(e => e.message),
            );
        }
        return instance as T;
    }

    /**
     * Updates the view's state
     */
    setState(key: string, value: unknown): void {
        this.state[key] = value;
    }

    /**
     * Gets a value from the state
     */
    getState(key: string): unknown {
        return this.state[key];
    }

    /**
     * Clones the view
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
     * Checks whether the view is valid
     */
    isValid(): boolean {
        return this.validate().isValid;
    }

    /**
     * Validates the view and returns the result
     */
    validateView(): ValidationResult {
        return this.validate();
    }

    /**
     * Gets the validation errors
     */
    getValidationErrors(): string[] {
        return this.validate().errors.map(e => e.message);
    }

    /**
     * Gets the validation warnings
     */
    getValidationWarnings(): string[] {
        return (this.validate().warnings || []).map(e => e.message);
    }

    /**
     * Updates the metadata
     */
    updateMetadata(metadata: Partial<BaseViewConfig['metadata']>): void {
        if (this.metadata) {
            this.metadata = { ...this.metadata, ...metadata };
        } else {
            this.metadata = metadata as BaseViewConfig['metadata'];
        }
    }

    /**
     * Gets the metadata
     */
    getMetadata(): BaseViewConfig['metadata'] {
        return this.metadata;
    }

    /**
     * Protected helper to set intro/note text with strict validation
     * Child views can expose this as setIntro(), etc.
     * @param fieldName - Name of the content field to set (e.g., 'intro')
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

    protected assertNavigationTarget(
        fieldName: string,
        target: string,
        options: { allowRelative?: boolean; allowViewId?: boolean } = {}
    ): string {
        const trimmed = target.trim();
        const validation = validateNavigationTarget(trimmed, {
            ...DEFAULT_URL_CONFIG,
            blockLocalhost: false,
            blockPrivateIPs: false
        }, options);

        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message).join('; ');
            throw new InvalidParameterError(fieldName, target, `Invalid navigation target: ${errorMessages}`);
        }

        return trimmed;
    }

    /**
     * Sets the next-view navigation target (validated to block open redirects).
     * Sets the next view (navigation)
     * Validates URL to prevent open redirects and malicious links
     */
    setNext(url: string): this {
        const target = this.assertNavigationTarget('url', url, {
            allowRelative: true,
            allowViewId: true
        });

        if (!this.navigation) {
            this.navigation = {};
        }
        this.navigation.next = target;
        return this;
    }

    /**
     * Sets the previous-view navigation target (validated to block open redirects).
     * Sets the previous view (navigation)
     * Validates URL to prevent open redirects and malicious links
     */
    setPrev(url: string): this {
        const target = this.assertNavigationTarget('url', url, {
            allowRelative: true,
            allowViewId: true
        });

        if (!this.navigation) {
            this.navigation = {};
        }
        this.navigation.prev = target;
        return this;
    }

    /**
     * Sets the process context for this view
     * @param processId - Unique process identifier
     * @param context - Additional context (steps, name, etc.)
     */
    setProcess(processId: string, context?: Partial<Omit<ProcessContext, 'processId'>>): this {
        this.processContext = {
            processId,
            ...(context || {})
        };

        return this;
    }

    /**
     * Gets the process context
     */
    getProcessContext(): ProcessContext | undefined {
        return this.processContext;
    }

    /**
     * Gets the process identifier (shortcut)
     */
    getProcessId(): string | undefined {
        return this.processContext?.processId;
    }

    /**
     * Checks whether this view is part of a process
     */
    hasProcess(): boolean {
        return this.processContext !== undefined;
    }

    /**
     * Updates the process context
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
     * Cleans up the view's resources
     */
    destroy(): void {
        this.state = {};
    }
} 
