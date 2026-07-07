import { BaseView } from './base-view';
import {
    GeoPoint,
    MapBasemap,
    MapContent,
    MapControls,
    MapLayer,
    MapMarker,
    MapPickConfig,
    MapShape,
    MapShapeStyle,
    MapViewport,
    MarkersLayer,
    ShapesLayer
} from '../types';
import {
    DuplicateLayerIdError,
    InvalidGeoPointError,
    InvalidParameterError,
    InvalidViewportError,
    LayerNotFoundError,
    LayerTypeMismatchError,
    MissingRequiredParameterError
} from '../errors';

/**
 * MapView (v2) — see specs/map-view.md
 *
 * Wire format: a single data path, `content.layers[]`. Even one-marker views
 * are described as `[{ type: 'markers', markers: [...] }]`.
 *
 * SDK ergonomics: `addMarker / addPolygon / addCircle / ...` are convenience
 * methods that target either an implicit default layer (`_default_markers` or
 * `_default_shapes`, auto-created on first call) or a named layer (passed as
 * the optional final `layerId` argument). Named layers must be declared up
 * front via `addLayer({...})`.
 *
 * Extends {@link BaseView}; instantiated by the YeriaApp/YeriaUI factory,
 * populated with these builders, then serialized to a JSON view description and
 * signed into a v3 envelope by `serve()`.
 */
export class MapView extends BaseView {

    static fromJson(json: Record<string, unknown>): MapView {
        return MapView.fromJsonAs(MapView, 'Map', json);
    }
    public static readonly DEFAULT_MARKERS_LAYER_ID = '_default_markers';
    public static readonly DEFAULT_SHAPES_LAYER_ID  = '_default_shapes';

    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Map',
            processId,
            metadata: {
                version: '2.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            layers: [],
            controls: { zoom: true, compass: true, userLocation: false }
        } as MapContent;
    }

    // ─── view-level setters ─────────────────────────────────────────────

    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    setBasemap(name: MapBasemap): this {
        (this.content as MapContent).basemap = name;
        return this;
    }

    setViewport(viewport: MapViewport): this {
        this.validateViewport(viewport);
        (this.content as MapContent).viewport = { ...viewport };
        return this;
    }

    setControls(controls: MapControls): this {
        (this.content as MapContent).controls = { ...controls };
        return this;
    }

    setEmptyMessage(text: string): this {
        (this.content as MapContent).emptyMessage = text;
        return this;
    }

    // Turns the map into a location picker that submits the chosen point to config.submitUrl.
    setPickMode(config: MapPickConfig): this {
        if (!config || typeof config.submitUrl !== 'string' || !config.submitUrl.trim()) {
            throw new MissingRequiredParameterError('pick.submitUrl');
        }
        const submitUrl = this.assertNavigationTarget('pick.submitUrl', config.submitUrl, {
            allowRelative: true,
            allowViewId: false
        });
        if (config.initialLocation) {
            this.validateGeoPoint(config.initialLocation, 'pick.initialLocation');
        }
        if (config.bounds) {
            this.validateGeoPoint(config.bounds.sw, 'pick.bounds.sw');
            this.validateGeoPoint(config.bounds.ne, 'pick.bounds.ne');
        }
        const content = this.content as MapContent;
        content.mode = 'pick';
        content.pick = { ...config, submitUrl };
        return this;
    }

    // ─── layer management ───────────────────────────────────────────────

    // Declares a named layer (markers/shapes/heatmap/tiles/geojson); ids must be unique.
    addLayer(layer: MapLayer): this {
        if (!layer || typeof layer !== 'object') {
            throw new MissingRequiredParameterError('layer');
        }
        if (typeof layer.id !== 'string' || !layer.id.trim()) {
            throw new MissingRequiredParameterError('layer.id');
        }
        const content = this.content as MapContent;
        if (content.layers.some(l => l.id === layer.id)) {
            throw new DuplicateLayerIdError(layer.id);
        }
        // Shallow copy so callers can't mutate the layer payload after the fact.
        const copy: MapLayer = { ...layer } as MapLayer;
        content.layers.push(copy);
        return this;
    }

    setLayers(layers: MapLayer[]): this {
        if (!Array.isArray(layers)) {
            throw new InvalidParameterError('layers', layers, 'must be an array');
        }
        (this.content as MapContent).layers = [];
        for (const l of layers) this.addLayer(l);
        return this;
    }

    clearLayers(): this {
        (this.content as MapContent).layers = [];
        return this;
    }

    getLayer(id: string): MapLayer | undefined {
        return (this.content as MapContent).layers.find(l => l.id === id);
    }

    // ─── markers (default layer or named target) ────────────────────────

    // Adds one marker to the default markers layer, or to the named layerId if given.
    addMarker(marker: MapMarker, layerId?: string): this {
        if (!marker || typeof marker !== 'object') {
            throw new MissingRequiredParameterError('marker');
        }
        if (typeof marker.id !== 'string' || !marker.id.trim()) {
            throw new MissingRequiredParameterError('marker.id');
        }
        this.validateGeoPoint(marker.location, `marker "${marker.id}".location`);

        const layer = this.resolveOrCreateMarkersLayer(layerId);
        layer.markers.push({
            ...marker,
            id: marker.id.trim(),
            title: marker.title?.trim(),
            description: marker.description?.trim()
        });
        return this;
    }

    addMarkers(markers: MapMarker[], layerId?: string): this {
        if (!Array.isArray(markers)) {
            throw new InvalidParameterError('markers', markers, 'must be an array');
        }
        for (const m of markers) this.addMarker(m, layerId);
        return this;
    }

    clearMarkers(layerId?: string): this {
        const target = layerId ?? MapView.DEFAULT_MARKERS_LAYER_ID;
        const layer = this.getLayer(target);
        if (!layer) return this;
        if (layer.type !== 'markers') {
            throw new LayerTypeMismatchError(target, 'markers', layer.type);
        }
        (layer as MarkersLayer).markers = [];
        return this;
    }

    // ─── shapes (default layer or named target) ─────────────────────────

    // Adds one shape to the default shapes layer, or to the named layerId if given.
    addShape(shape: MapShape, layerId?: string): this {
        if (!shape || typeof shape !== 'object') {
            throw new MissingRequiredParameterError('shape');
        }
        if (typeof shape.id !== 'string' || !shape.id.trim()) {
            throw new MissingRequiredParameterError('shape.id');
        }
        this.validateShape(shape);

        const layer = this.resolveOrCreateShapesLayer(layerId);
        layer.shapes.push({ ...shape, id: shape.id.trim() } as MapShape);
        return this;
    }

    // Convenience wrapper over addShape for a Polygon (>= 3 points).
    addPolygon(id: string, points: GeoPoint[], config?: MapShapeStyle, layerId?: string): this {
        return this.addShape({ id, type: 'Polygon', points, config }, layerId);
    }

    // Convenience wrapper over addShape for a Circle (center + radius in meters).
    addCircle(id: string, center: GeoPoint, radius: number, config?: MapShapeStyle, layerId?: string): this {
        return this.addShape({ id, type: 'Circle', center, radius, config }, layerId);
    }

    // Convenience wrapper over addShape for a Polyline (>= 2 points).
    addPolyline(id: string, points: GeoPoint[], config?: MapShapeStyle, layerId?: string): this {
        return this.addShape({ id, type: 'Polyline', points, config }, layerId);
    }

    // Convenience wrapper over addShape for a Rectangle (south-west + north-east corners).
    addRectangle(id: string, sw: GeoPoint, ne: GeoPoint, config?: MapShapeStyle, layerId?: string): this {
        return this.addShape({ id, type: 'Rectangle', sw, ne, config }, layerId);
    }

    clearShapes(layerId?: string): this {
        const target = layerId ?? MapView.DEFAULT_SHAPES_LAYER_ID;
        const layer = this.getLayer(target);
        if (!layer) return this;
        if (layer.type !== 'shapes') {
            throw new LayerTypeMismatchError(target, 'shapes', layer.type);
        }
        (layer as ShapesLayer).shapes = [];
        return this;
    }

    getContent(): MapContent {
        return this.content as MapContent;
    }

    // ─── private helpers ────────────────────────────────────────────────

    private resolveOrCreateMarkersLayer(layerId?: string): MarkersLayer {
        const content = this.content as MapContent;
        if (layerId) {
            const layer = content.layers.find(l => l.id === layerId);
            if (!layer) throw new LayerNotFoundError(layerId);
            if (layer.type !== 'markers') {
                throw new LayerTypeMismatchError(layerId, 'markers', layer.type);
            }
            return layer as MarkersLayer;
        }
        let def = content.layers.find(l => l.id === MapView.DEFAULT_MARKERS_LAYER_ID);
        if (!def) {
            const created: MarkersLayer = {
                id: MapView.DEFAULT_MARKERS_LAYER_ID,
                type: 'markers',
                markers: [],
                toggleable: false
            };
            content.layers.push(created);
            return created;
        }
        if (def.type !== 'markers') {
            throw new LayerTypeMismatchError(def.id, 'markers', def.type);
        }
        return def as MarkersLayer;
    }

    private resolveOrCreateShapesLayer(layerId?: string): ShapesLayer {
        const content = this.content as MapContent;
        if (layerId) {
            const layer = content.layers.find(l => l.id === layerId);
            if (!layer) throw new LayerNotFoundError(layerId);
            if (layer.type !== 'shapes') {
                throw new LayerTypeMismatchError(layerId, 'shapes', layer.type);
            }
            return layer as ShapesLayer;
        }
        let def = content.layers.find(l => l.id === MapView.DEFAULT_SHAPES_LAYER_ID);
        if (!def) {
            const created: ShapesLayer = {
                id: MapView.DEFAULT_SHAPES_LAYER_ID,
                type: 'shapes',
                shapes: [],
                toggleable: false
            };
            content.layers.push(created);
            return created;
        }
        if (def.type !== 'shapes') {
            throw new LayerTypeMismatchError(def.id, 'shapes', def.type);
        }
        return def as ShapesLayer;
    }

    private validateGeoPoint(p: GeoPoint | undefined, ctx: string): void {
        if (!p || typeof p !== 'object') {
            throw new InvalidGeoPointError(p, `${ctx}: location is required`);
        }
        if (typeof p.lat !== 'number' || p.lat < -90 || p.lat > 90) {
            throw new InvalidGeoPointError(p, `${ctx}: lat must be a number in [-90, 90]`);
        }
        if (typeof p.lon !== 'number' || p.lon < -180 || p.lon > 180) {
            throw new InvalidGeoPointError(p, `${ctx}: lon must be a number in [-180, 180]`);
        }
    }

    private validateShape(s: MapShape): void {
        switch (s.type) {
            case 'Polygon': {
                if (!Array.isArray(s.points) || s.points.length < 3) {
                    throw new InvalidParameterError('points', s.points, 'Polygon requires at least 3 points');
                }
                s.points.forEach((p, i) => this.validateGeoPoint(p, `Polygon "${s.id}" points[${i}]`));
                break;
            }
            case 'Polyline': {
                if (!Array.isArray(s.points) || s.points.length < 2) {
                    throw new InvalidParameterError('points', s.points, 'Polyline requires at least 2 points');
                }
                s.points.forEach((p, i) => this.validateGeoPoint(p, `Polyline "${s.id}" points[${i}]`));
                break;
            }
            case 'Circle': {
                this.validateGeoPoint(s.center, `Circle "${s.id}" center`);
                if (typeof s.radius !== 'number' || s.radius <= 0) {
                    throw new InvalidParameterError('radius', s.radius, 'Circle radius must be > 0 (meters)');
                }
                break;
            }
            case 'Rectangle': {
                this.validateGeoPoint(s.sw, `Rectangle "${s.id}" sw`);
                this.validateGeoPoint(s.ne, `Rectangle "${s.id}" ne`);
                if (s.sw.lat > s.ne.lat || s.sw.lon > s.ne.lon) {
                    throw new InvalidParameterError(
                        'sw,ne',
                        { sw: s.sw, ne: s.ne },
                        'Rectangle sw must be south-west of ne (sw.lat <= ne.lat and sw.lon <= ne.lon)'
                    );
                }
                break;
            }
            default: {
                // exhaustiveness guard — TypeScript will flag if a new shape type is added
                const _exhaustive: never = s;
                throw new InvalidParameterError('shape.type', (_exhaustive as MapShape).type, 'unknown shape type');
            }
        }
    }

    private validateViewport(v: MapViewport): void {
        if (v.center) this.validateGeoPoint(v.center, 'viewport.center');
        if (v.bounds) {
            this.validateGeoPoint(v.bounds.sw, 'viewport.bounds.sw');
            this.validateGeoPoint(v.bounds.ne, 'viewport.bounds.ne');
            if (v.bounds.sw.lat > v.bounds.ne.lat || v.bounds.sw.lon > v.bounds.ne.lon) {
                throw new InvalidViewportError('viewport.bounds.sw must be south-west of bounds.ne');
            }
        }
        if (v.zoom !== undefined && (v.zoom < 0 || v.zoom > 22)) {
            throw new InvalidViewportError('zoom must be in [0, 22]');
        }
        if (v.minZoom !== undefined && (v.minZoom < 0 || v.minZoom > 22)) {
            throw new InvalidViewportError('minZoom must be in [0, 22]');
        }
        if (v.maxZoom !== undefined && (v.maxZoom < 0 || v.maxZoom > 22)) {
            throw new InvalidViewportError('maxZoom must be in [0, 22]');
        }
        if (v.minZoom !== undefined && v.maxZoom !== undefined && v.minZoom > v.maxZoom) {
            throw new InvalidViewportError('minZoom must be <= maxZoom');
        }
        if (v.bearing !== undefined && (v.bearing < 0 || v.bearing >= 360)) {
            throw new InvalidViewportError('bearing must be in [0, 360)');
        }
        if (v.pitch !== undefined && (v.pitch < 0 || v.pitch > 60)) {
            throw new InvalidViewportError('pitch must be in [0, 60]');
        }
    }
}
