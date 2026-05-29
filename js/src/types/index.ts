import { z } from 'zod';

// Types de base pour les vues
export type ViewType =
    | 'Reader'
    | 'ActionList'
    | 'ActionGrid'
    | 'Form'
    | 'QRScan'
    | 'QRDisplay'
    | 'Dialog'
    | 'Message'
    | 'Card'
    | 'Carousel'
    | 'Timeline'
    | 'Media'
    | 'Map';

// Types pour les messages
export type MessageType = 'error' | 'info' | 'warning' | 'success';

// Types pour les méthodes HTTP
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Types pour les notifications
export interface NotificationMessage {
    title: string;
    body: string;
    link?: string; // Optional in-app navigation link (e.g., "/profile" or "app://view/123")
}

export interface NotificationPayload {
    userId: string;
    message: NotificationMessage;
}

export interface SecureNotificationResponse {
    appId: string;
    signature: string;
    timestamp: number;
    notification: NotificationPayload;
}

export interface NotificationConfig {
    platformUrl?: string; // City-Mate platform endpoint URL
    timeout?: number; // HTTP request timeout in ms (default: 5000)
}

// Configuration de navigation pour les vues
export interface NavigationConfig {
    next?: string;  // URL ou viewId de la vue suivante
    prev?: string;  // URL ou viewId de la vue précédente
}

// Context de processus pour les workflows multi-étapes
export interface ProcessContext {
    processId: string;           // Identifiant unique du processus
    processName?: string;        // Nom lisible du processus
    currentStep?: number;        // Étape actuelle (1-based)
    totalSteps?: number;         // Nombre total d'étapes
    stepName?: string;           // Nom de l'étape actuelle
    canGoBack?: boolean;         // Peut revenir en arrière
    canSkip?: boolean;           // Peut sauter cette étape
    metadata?: Record<string, unknown>;  // Métadonnées du processus
}

// Configuration de base pour toutes les vues
export interface BaseViewConfig {
    id: string;
    type: ViewType;
    processId?: string;          // Identifiant de processus (optionnel)
    metadata?: {
        version: string;
        createdAt: Date;
        author?: string;
        tags?: string[];
    };
}

// Configuration pour les champs de formulaire
export interface FieldValidation {
    required?: boolean;
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    customValidator?: (value: unknown) => boolean | string;
    dependencies?: string[]; // Champs requis si ce champ est rempli
    conditional?: (formData: Record<string, unknown>) => boolean;
}

export interface FormFieldParams extends FieldValidation {
    value?: string;
    options?: Array<{ label: string; value: unknown; selected?: boolean }>;
    accept?: string[];
    live?: boolean;
    placeholder?: string;
    helpText?: string;
    disabled?: boolean;
    readonly?: boolean;
    minDate?: string;      // For date fields: minimum date (YYYY-MM-DD)
    maxDate?: string;      // For date fields: maximum date (YYYY-MM-DD)
}

// Configuration pour les actions
export interface ActionConfig {
    code: string;
    title: string;
    desc?: string;
    thumbnail?: string;
    disabled?: boolean;
    metadata?: Record<string, unknown>;
}

// Configuration pour les éléments de contenu
export interface ContentElement {
    type: string;
    [key: string]: unknown;
}

export interface MarkdownPage {
    content: string;
    raw: string;
    sanitized: boolean;
}

export type ReaderElement =
    | { type: 'paragraph'; text: string }
    | { type: 'subtitle'; text: string }
    | { type: 'image'; url: string; alt?: string; caption?: string }
    | { type: 'markdown'; pages: MarkdownPage[] }
    | { type: 'list'; items: string[]; ordered?: boolean }
    | { type: 'link'; url: string; text: string; description?: string }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'code'; code: string; language?: string }
    | { type: 'quote'; text: string; author?: string; source?: string }
    | { type: 'separator' }
    | { type: 'custom'; kind: string; data: Record<string, unknown> };

export interface CardImage {
    url: string;
    alt?: string;
}

export interface CardStat {
    label: string;
    value: string;
}

export interface CardSection {
    heading: string;
    body: string;
}

export type CardActionVariant = 'primary' | 'secondary' | 'link';

export interface CardAction {
    text: string;
    method?: HttpMethod;
    confirmMessage?: string;
    href?: string;
    icon?: string;
    variant?: CardActionVariant;
}

export interface CardContent {
    title: string;
    subtitle?: string;
    description?: string;
    badge?: string;
    image?: CardImage;
    stats: CardStat[];
    sections: CardSection[];
    actions: CardAction[];
    meta?: Record<string, unknown>;
}

export interface CarouselSlide {
    id: string;
    title: string;
    description?: string;
    badge?: string;
    image?: CardImage;
    actions?: CardAction[];
    meta?: Record<string, unknown>;
}

export interface CarouselSettings {
    autoplay?: boolean;
    intervalMs?: number;
    loop?: boolean;
    showIndicators?: boolean;
}

export interface CarouselContent {
    title: string;
    subtitle?: string;
    slides: CarouselSlide[];
    settings?: CarouselSettings;
}

export type TimelineStatus = 'pending' | 'active' | 'completed' | 'error';

export interface TimelineItem {
    id: string;
    title: string;
    timestamp: string;
    description?: string;
    status?: TimelineStatus;
    icon?: string;
    meta?: Record<string, unknown>;
}

export interface TimelineContent {
    title: string;
    intro?: string;
    items: TimelineItem[];
}

export type MediaKind = 'audio' | 'video';

export interface MediaSource {
    src: string;
    type?: string;
}

export interface MediaItem {
    id: string;
    kind: MediaKind;
    title?: string;
    description?: string;
    poster?: string;
    autoplay?: boolean;
    loop?: boolean;
    controls?: boolean;
    sources: MediaSource[];
    meta?: Record<string, unknown>;
}

export interface MediaContent {
    title: string;
    intro?: string;
    items: MediaItem[];
}

// ============================================================
// MapView v2 — see specs/map-view.md
// ============================================================

/** Action target — same shape used across Yeria views (marker click, shape click, popup buttons). */
export interface ActionRef {
    url: string;
    method?: HttpMethod;       // default GET
    body?: Record<string, unknown>;
    confirm?: { title: string; message: string; submitLabel?: string };
}

/** Rich popup content for a marker (supersedes the default title+description popup). */
export interface MarkerPopup {
    title?: string;            // defaults to marker.title
    body?: string;             // markdown allowed
    image?: string;            // URL
    actions?: ActionRef[];     // inline action buttons inside the popup
}

export type MapMarkerSize = 'sm' | 'md' | 'lg';

export interface MapMarker {
    id: string;
    location: GeoPoint;
    // Display
    title?: string;
    description?: string;
    icon?: string;             // catalog name | URL | data: URI
    color?: string;            // hex string, e.g. '#1A73E8'
    size?: MapMarkerSize;      // default 'md'
    selected?: boolean;        // renderer should highlight; default false
    // Interaction
    action?: ActionRef;
    popup?: MarkerPopup;
    // Free-form
    meta?: Record<string, unknown>;
}

// ----- Viewport / Controls -----
export interface MapViewport {
    center?: GeoPoint;
    zoom?: number;
    bounds?: { sw: GeoPoint; ne: GeoPoint };
    fitMarkers?: boolean;      // takes precedence over bounds + center+zoom
    minZoom?: number;
    maxZoom?: number;
    bearing?: number;          // 0..360
    pitch?: number;            // 0..60
}

export type MapBasemap = 'streets' | 'satellite' | 'terrain' | 'dark' | 'auto';

export interface MapControls {
    zoom?: boolean;            // default true
    compass?: boolean;         // default true
    userLocation?: boolean;    // default false
    layerToggle?: boolean;     // default true if any layer is toggleable
    scale?: boolean;           // default false
    fullscreen?: boolean;      // default false
    attribution?: string;      // overrides renderer default attribution
}

// ----- Shapes (typed discriminated union) -----
export type MapShapeType = 'Polygon' | 'Circle' | 'Polyline' | 'Rectangle';

export interface MapShapeStyle {
    fillColor?: string;
    fillOpacity?: number;      // 0..1
    strokeColor?: string;
    strokeOpacity?: number;    // 0..1
    strokeWidth?: number;      // px
    dashed?: boolean;
}

interface MapShapeBase {
    id: string;
    config?: MapShapeStyle;
    action?: ActionRef;
    meta?: Record<string, unknown>;
}

export interface PolygonShape extends MapShapeBase {
    type: 'Polygon';
    points: GeoPoint[];        // 3+ points
}

export interface CircleShape extends MapShapeBase {
    type: 'Circle';
    center: GeoPoint;
    radius: number;            // meters
}

export interface PolylineShape extends MapShapeBase {
    type: 'Polyline';
    points: GeoPoint[];        // 2+ points
}

export interface RectangleShape extends MapShapeBase {
    type: 'Rectangle';
    sw: GeoPoint;
    ne: GeoPoint;
}

export type MapShape = PolygonShape | CircleShape | PolylineShape | RectangleShape;

// ----- Layers -----
export type MapLayerType = 'markers' | 'shapes' | 'heatmap' | 'tiles' | 'geojson';

interface MapLayerBase {
    id: string;
    name?: string;             // shown in legend / toggle UI
    legendIcon?: string;
    visible?: boolean;         // default true
    toggleable?: boolean;      // default true
    zIndex?: number;
    minZoom?: number;
    maxZoom?: number;
}

export interface MarkersLayer extends MapLayerBase {
    type: 'markers';
    markers: MapMarker[];
    cluster?: boolean;         // default true when markers.length > 50
    clusterRadius?: number;    // px; default 50
}

export interface ShapesLayer extends MapLayerBase {
    type: 'shapes';
    shapes: MapShape[];
}

export interface HeatmapPoint {
    lat: number;
    lon: number;
    intensity?: number;        // 0..intensityMax; default 1
}

export interface HeatmapLayer extends MapLayerBase {
    type: 'heatmap';
    points: HeatmapPoint[];
    radius?: number;           // px; default 25
    intensityMax?: number;     // default 1
    colorRamp?: string[];      // hex stops, low-to-high
}

export interface TilesLayer extends MapLayerBase {
    type: 'tiles';
    url: string;               // {z}/{x}/{y} template
    attribution: string;
    maxNativeZoom?: number;
    opacity?: number;          // 0..1
}

export interface GeoJsonLayer extends MapLayerBase {
    type: 'geojson';
    data: object;              // RFC 7946 FeatureCollection | Feature | Geometry
    defaultMarkerIcon?: string;
    defaultShapeStyle?: MapShapeStyle;
}

export type MapLayer = MarkersLayer | ShapesLayer | HeatmapLayer | TilesLayer | GeoJsonLayer;

// ----- Picker (location input) -----
export interface MapPickConfig {
    prompt?: string;
    initialLocation?: GeoPoint;
    submitUrl: string;
    submitMethod?: 'POST' | 'PUT';      // default POST
    submitLabel?: string;                // default 'Confirm'
    payloadKey?: string;                 // default 'location'
    bounds?: { sw: GeoPoint; ne: GeoPoint };
    snapToMarkers?: boolean;             // default false
}

export type MapMode = 'view' | 'pick';

// ----- Content -----
export interface MapContent {
    title: string;
    intro?: string;
    viewport?: MapViewport;
    basemap?: MapBasemap;                // default 'auto'
    layers: MapLayer[];                  // single data path; empty stack requires emptyMessage in 'view' mode
    controls?: MapControls;
    emptyMessage?: string;
    mode?: MapMode;                      // default 'view'
    pick?: MapPickConfig;                // required when mode === 'pick'
}

// Configuration pour les actions de soumission (convention-based)
export interface SubmitAction {
    text: string;              // Button text: "Register", "Submit", etc.
    method?: HttpMethod;       // Optional: defaults to POST
    confirmMessage?: string;   // Optional confirmation: "Are you sure?"
}

// Schémas de validation Zod
export const FieldSchema = z.object({
    fieldType: z.string(),
    fieldId: z.string(),
    fieldLabel: z.string(),
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    options: z.array(z.object({
        label: z.string(),
        value: z.unknown(),
    })).optional(),
    accept: z.array(z.string()).optional(),
    live: z.boolean().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    disabled: z.boolean().optional(),
    readonly: z.boolean().optional(),
});

export const ActionSchema = z.object({
    code: z.string(),
    title: z.string(),
    desc: z.string().optional(),
    thumbnail: z.string().optional(),
    disabled: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
});

// Types pour les plugins
export interface ViewPlugin {
    name: string;
    version: string;
    enhance(view: any): void;
    priority?: number;
}

// Types pour les champs personnalisés
export interface CustomFieldType {
    type: string;
    renderer: (config: Record<string, unknown>) => unknown;
    validator: (value: unknown) => boolean;
    schema?: z.ZodSchema;
}

// Types pour la gestion d'état
export interface ViewState {
    [key: string]: unknown;
}

// Types pour les résultats de validation
export interface ValidationError {
    field?: string;
    code?: string;
    message: string;
    value?: unknown;
    constraint?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings?: ValidationError[];
}

/**
 * Helper to create ValidationError from string (backward compatibility)
 */
export function createValidationError(message: string, field?: string): ValidationError {
    return { message, field };
}

/**
 * Helper to convert string array to ValidationError array (backward compatibility)
 */
export function toValidationErrors(messages: string[], field?: string): ValidationError[] {
    return messages.map(message => ({ message, field }));
}

// Types pour la sérialisation
export interface SerializationOptions {
    compress?: boolean;
    includeMetadata?: boolean;
    format?: 'json' | 'compact';
}

// Types pour l'internationalisation
export interface I18nConfig {
    locale: string;
    fallbackLocale?: string;
    translations: Record<string, Record<string, string>>;
}

// Types pour le logging
export interface LogEntry {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    stack?: string;
}

// Types pour les coordonnées géographiques
export interface GeoPoint {
    lat: number;
    lon: number;
    altitude?: number;
    precision?: number;
}

// Types pour les configurations GPS
export interface GPSConfig {
    altitude?: boolean;
    precision?: boolean;
    liveData?: boolean;
    timeout?: number;
}

// Types pour les configurations de fichiers
export interface FileConfig {
    maxSize?: number; // en bytes
    allowedTypes: string[];
    multiple?: boolean;
    compress?: boolean;
}

// Types pour les configurations QR (QRDisplay only)
export interface QRConfig {
    size?: number;
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
}

// QRScan view content (scanner configuration)
// The mobile app handles all scanner implementation (camera, torch, formats, UI)
// The view only describes what to scan and where to submit
export interface QRScanContent {
    title: string;                    // View title: "Scan Ticket"
    intro?: string;                   // User instructions
    autoSubmit?: boolean;             // Auto-submit after scan (default: true)
    submit?: SubmitAction;            // If present, disables autoSubmit
    validation?: {                    // Optional simple validation rules (mobile validates, server MUST re-validate)
        format?: 'text' | 'number' | 'url' | 'email';  // Simple format validation
        startsWith?: string;          // Required prefix (exempt from format validation)
        minLength?: number;           // Min length (includes prefix if startsWith is set)
        maxLength?: number;           // Max length (includes prefix if startsWith is set)
        errorMessage?: string;        // Error message to show user
    };
    preview?: {                       // Preview before submit (requires submit button)
        enabled?: boolean;
        editable?: boolean;           // Allow manual correction
        label?: string;               // Field label in preview: "Scanned Code"
    };
}
