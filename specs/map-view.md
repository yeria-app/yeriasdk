# MapView Component Specification — v2

**Status:** Draft. Clean break from v1; no production data, no migration concerns.

## Description

The `MapView` component renders geographic data on an interactive map. The wire format is structured around a stack of named **layers** — markers, shapes, heatmaps, custom tile sources, or raw GeoJSON — that the renderer composes into one view, with an optional UI toggle panel.

### Design philosophy

- **Backend describes data + intent.** The backend specifies *what* to display (markers, shapes, layer ordering, default visibility, click actions) and *what camera* to start with. The renderer owns *how it looks* (icons, animations, gestures) and translates the spec into native widgets (`flutter_map` `Marker`/`Polyline`/`Polygon`/`CircleMarker` on mobile, `mapbox-gl` / `leaflet` layers on web).
- **One coordinate convention, everywhere.** All geographic points are `{ lat: number, lon: number }` objects. Array-form coordinates (`[lon, lat]` or `[lat, lon]`) are never accepted in any field, including inside GeoJSON layer payloads — see [Coordinate convention](#coordinate-convention).
- **Layers are first-class — and the only data path on the wire.** Even a single-marker map is described as `layers: [{ type: 'markers', markers: [...] }]`. The SDK provides convenience methods (`addMarker`, `addPolygon`, …) that compose into layers under the hood, so backend authors keep terse code.
- **GeoJSON is an escape hatch, not the default.** A backend that already produces GeoJSON (PostGIS, Overpass, etc.) can wire it in via a `geojson` layer type, but the typed `markers` / `shapes` layer types exist so backend authors don't need GIS expertise for the common cases.

## Quick start

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

const yeriaApp = new YeriaApp({ appId: 'my-app' });

// `addMarker` is a convenience method — under the hood it appends to a
// default markers layer, creating it on first call. The wire payload that
// reaches the renderer is always shaped as `{ layers: [...] }`.
const map = yeriaApp.createMapView('stores-map', 'Partner Stores')
  .setIntro('Find our partner stores')
  .setViewport({ center: { lat: 48.8566, lon: 2.3522 }, zoom: 12 })
  .setControls({ zoom: true, userLocation: true, layerToggle: true })
  .addMarker({
    id: 'paris',
    location: { lat: 48.8566, lon: 2.3522 },
    title: 'Paris Centre',
    description: 'Open 9–19',
    icon: 'store',
    action: { method: 'GET', url: '/api/stores/paris' }
  });

return yeriaApp.serve(map);
```

## Top-level model

```ts
interface MapView {
  id: string;
  type: 'Map';
  content: MapContent;
  metadata?: ViewMetadata;
  process?: ProcessContext;
}

interface MapContent {
  // Header
  title: string;
  intro?: string;

  // Camera
  viewport?: MapViewport;
  basemap?: 'streets' | 'satellite' | 'terrain' | 'dark' | 'auto'; // default 'auto'

  // Data — always layered
  layers: MapLayer[];

  // UI
  controls?: MapControls;
  emptyMessage?: string;      // shown if no layer ends up drawable

  // Input mode (location picker)
  mode?: 'view' | 'pick';     // default 'view'
  pick?: MapPickConfig;       // required when mode === 'pick'
}
```

`layers[]` is the single data path — even a one-marker map is described as one `markers` layer with one entry. The SDK convenience methods (`addMarker`, `addPolygon`, …) build/append to default layers so backend code stays terse. A view that resolves to zero drawable layers in `mode: 'view'` requires `emptyMessage`; in `mode: 'pick'`, the user-placed marker is the data.

## Coordinate convention

Every geographic point in this spec is:

```ts
interface GeoPoint {
  lat: number;       // -90 to 90
  lon: number;       // -180 to 180
  altitude?: number; // meters above sea level
  precision?: number;// horizontal accuracy in meters (sensor data)
}
```

- **Always an object**, never an array. `[lat, lon]` and `[lon, lat]` are both rejected by the SDK validator.
- Renderer-side conversion is one line:
  - **Dart / `latlong2`:** `LatLng(p.lat as double, p.lon as double)`
  - **Mapbox GL / Leaflet:** `[p.lon, p.lat]` (lon first, GeoJSON convention)
  - **`flutter_map_geojson`:** the SDK's `geojson` layer type emits already-converted GeoJSON, so renderers using that path consume `[lon, lat]` only inside GeoJSON payloads — the rest of the spec stays `{lat, lon}`.

## Markers

```ts
interface MapMarker {
  id: string;
  location: GeoPoint;

  // Display
  title?: string;
  description?: string;
  icon?: string;          // catalog name OR full URL OR data: URI
  color?: string;         // hex string, e.g. '#1A73E8'; falls back to renderer default
  size?: 'sm' | 'md' | 'lg'; // default 'md'
  selected?: boolean;     // renderer should highlight; default false

  // Interaction
  action?: ActionRef;     // see "Actions"
  popup?: MarkerPopup;    // overrides the default title+description popup

  // Free-form
  meta?: Record<string, unknown>;
}

interface MarkerPopup {
  title?: string;         // defaults to marker.title
  body?: string;          // markdown allowed
  image?: string;         // URL
  actions?: ActionRef[];  // buttons inside the popup
}
```

Renderers should treat `icon` as: (a) a known catalog name (e.g. `'store'`, `'home'`, `'pin'`) if it matches their catalog; (b) a URL if it starts with `http(s)://` or `data:`; (c) fall back to the renderer's default pin and ignore unknown values.

## Shapes (typed geometry)

`shapes` replaces v1's polygon-via-`overlays` path. Drawn on top of basemap, below markers (unless layer `zIndex` says otherwise).

```ts
type MapShape = PolygonShape | CircleShape | PolylineShape | RectangleShape;

interface ShapeBase {
  id: string;
  config?: ShapeStyle;
  action?: ActionRef;     // optional click handler
  meta?: Record<string, unknown>;
}

interface PolygonShape extends ShapeBase {
  type: 'Polygon';
  points: GeoPoint[];     // 3+ points; the polygon auto-closes
}

interface CircleShape extends ShapeBase {
  type: 'Circle';
  center: GeoPoint;
  radius: number;         // meters
}

interface PolylineShape extends ShapeBase {
  type: 'Polyline';
  points: GeoPoint[];     // 2+ points
}

interface RectangleShape extends ShapeBase {
  type: 'Rectangle';
  sw: GeoPoint;           // south-west corner
  ne: GeoPoint;           // north-east corner
}

interface ShapeStyle {
  fillColor?: string;
  fillOpacity?: number;   // 0–1
  strokeColor?: string;
  strokeOpacity?: number; // 0–1
  strokeWidth?: number;   // px
  dashed?: boolean;
}
```

## Viewport

```ts
interface MapViewport {
  // Pick ONE of (center+zoom) or (bounds) or (fitMarkers)
  center?: GeoPoint;
  zoom?: number;          // typical 0–22
  bounds?: { sw: GeoPoint; ne: GeoPoint };
  fitMarkers?: boolean;   // if true, renderer fits viewport to all visible markers + shapes; takes precedence

  // Constraints
  minZoom?: number;
  maxZoom?: number;

  // 3D — renderer may ignore if unsupported (must NOT throw)
  bearing?: number;       // 0–360, default 0
  pitch?: number;         // 0–60, default 0
}
```

Resolution order at render time: `fitMarkers` → `bounds` → `center+zoom`. If none are supplied and there is at least one marker/shape, the renderer fits to the data; otherwise it shows a sensible default region (renderer choice).

## Controls

```ts
interface MapControls {
  zoom?: boolean;            // zoom +/- buttons; default true
  compass?: boolean;         // shown when bearing != 0; default true
  userLocation?: boolean;    // "locate me" button; default false
  layerToggle?: boolean;     // legend / show-hide panel; default true if any layer is `toggleable`
  scale?: boolean;           // distance scale; default false
  fullscreen?: boolean;      // default false
  attribution?: string;      // override; renderer must always show some attribution
}
```

## Layers (multi-layer composition)

When more than one logical dataset shares a map (e.g. *Stores*, *Coverage zones*, *Traffic*), use `layers[]`:

```ts
type MapLayer =
  | MarkersLayer
  | ShapesLayer
  | HeatmapLayer
  | TilesLayer
  | GeoJsonLayer;

interface LayerBase {
  id: string;                // stable id; clients persist toggle state by id
  name?: string;             // shown in legend / toggle UI
  legendIcon?: string;       // icon shown next to `name`
  visible?: boolean;         // default true
  toggleable?: boolean;      // user can show/hide; default true
  zIndex?: number;           // higher = on top; default by insertion order
  minZoom?: number;          // hide below this zoom
  maxZoom?: number;          // hide above this zoom
}

interface MarkersLayer extends LayerBase {
  type: 'markers';
  markers: MapMarker[];
  cluster?: boolean;         // default true when markers.length > 50
  clusterRadius?: number;    // px; default 50
}

interface ShapesLayer extends LayerBase {
  type: 'shapes';
  shapes: MapShape[];
}

interface HeatmapLayer extends LayerBase {
  type: 'heatmap';
  points: Array<{ lat: number; lon: number; intensity?: number }>;
  radius?: number;           // px; default 25
  intensityMax?: number;     // default 1
  colorRamp?: string[];      // hex stops, low-to-high; renderer default if omitted
}

interface TilesLayer extends LayerBase {
  type: 'tiles';
  url: string;               // {z}/{x}/{y} template
  attribution: string;       // required by most providers
  maxNativeZoom?: number;
  opacity?: number;          // 0–1
}

interface GeoJsonLayer extends LayerBase {
  type: 'geojson';
  data: object;              // RFC 7946 FeatureCollection | Feature | Geometry
  // Defaults applied to features that lack `properties.style`:
  defaultMarkerIcon?: string;
  defaultShapeStyle?: ShapeStyle;
}
```

### Where do `addMarker` / `addShape` / friends append to?

The convenience methods all take an **optional final `layerId` argument** that selects the target layer:

| Call | Target |
|---|---|
| `addMarker(m)` *(no layerId)* | Default markers layer `_default_markers`. Auto-created on first call with `name: undefined`, `toggleable: false`. |
| `addMarker(m, 'stores')` | Layer with `id: 'stores'`. **Must already exist** (created via `addLayer({...})`). Throws `LayerNotFoundError` otherwise. |
| `addPolygon(id, points, config?)` *(no layerId)* | Default shapes layer `_default_shapes`. |
| `addPolygon(id, points, config?, 'zones')` | Named layer `'zones'`. Same pre-existence rule. |
| Same pattern for `addMarkers`, `addCircle`, `addPolyline`, `addRectangle`, `addShape`. | |

Type mismatches throw `LayerTypeMismatchError` at the moment of the call (e.g. trying to append a marker to a `shapes`-type layer). Errors fire on the SDK builder, not at `serve()`, so backend authors get immediate feedback in dev.

There is no hidden "current layer" cursor — every call either uses the default layer or names a target explicitly.

```javascript
// Simple case — no layer ceremony
map.addMarker({ id: 'home', location: { lat: 6.13, lon: 1.22 } });
//  → goes into _default_markers (auto-created)

// Multi-layer case — declare, then target
map
  .addLayer({ id: 'stores', type: 'markers', name: 'Boutiques', cluster: true })
  .addLayer({ id: 'events', type: 'markers', name: 'Événements' });

map.addMarker({ id: 'paris', location: { lat: 48.85, lon: 2.35 } }, 'stores');
map.addMarker({ id: 'fest',  location: { lat: 43.60, lon: 1.44 } }, 'events');
```

## Picker mode (location input)

For workflows that need a user-chosen location:

```ts
interface MapPickConfig {
  prompt?: string;                 // helper text above the map; e.g. "Tap to choose your delivery point"
  initialLocation?: GeoPoint;
  submitUrl: string;               // URL the picked location is POSTed to
  submitMethod?: 'POST' | 'PUT';   // default POST
  submitLabel?: string;            // confirm button label; default "Confirm"
  payloadKey?: string;             // key under which the location is sent; default 'location'
  bounds?: { sw: GeoPoint; ne: GeoPoint }; // restrict pickable area
  snapToMarkers?: boolean;         // default false; if true, picking snaps to the nearest existing marker
}
```

When `mode === 'pick'`, the renderer:
1. Shows the map with the existing markers/shapes as context.
2. Lets the user place/move a single picker marker (initialized at `pick.initialLocation` or the user's current location if `controls.userLocation` is on).
3. On confirm, sends `POST pick.submitUrl` with body `{ [pick.payloadKey]: { lat, lon }, processContext? }`.

The mobile picker primitive already exists in [yeria-app/lib/presentation/shared/widgets/map_picker/gps_map_picker_widget.dart](yeria-app/lib/presentation/shared/widgets/map_picker/gps_map_picker_widget.dart) — the spec just gives it a wire format.

## Actions

`ActionRef` is the same shape every other Yeria view uses, so the JsonRenderer's action dispatcher routes map clicks through one path:

```ts
interface ActionRef {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // default GET
  body?: Record<string, unknown>;
  confirm?: { title: string; message: string; submitLabel?: string };
}
```

Marker `action` and shape `action` are both supported. If absent, tapping the marker shows the popup (or does nothing for a shape).

## SDK methods (JavaScript)

| Method | Description |
|---|---|
| **View setup** | |
| `setIntro(text)` | Intro paragraph above the map. |
| `setViewport(viewport)` | `viewport` is a `MapViewport`; pass `{ center, zoom }` for the simple case. |
| `setBasemap(name)` | `'streets' \| 'satellite' \| 'terrain' \| 'dark' \| 'auto'`. |
| `setControls(controls)` | `MapControls` partial; merged with defaults. |
| `setEmptyMessage(text)` | Shown when no layer ends up drawable. |
| **Convenience — default layer or named target via optional `layerId`** | |
| `addMarker(marker, layerId?)` / `addMarkers(markers, layerId?)` | Append into `layerId` (must exist) or `_default_markers` (auto-created on first call). |
| `clearMarkers(layerId?)` | Empty the targeted markers layer (default if omitted). |
| `addPolygon(id, points, config?, layerId?)` | Append a `Polygon` into `layerId` or `_default_shapes`. |
| `addCircle(id, center, radius, config?, layerId?)` | Append a `Circle`. |
| `addPolyline(id, points, config?, layerId?)` | Append a `Polyline`. |
| `addRectangle(id, sw, ne, config?, layerId?)` | Append a `Rectangle`. |
| `addShape(shape, layerId?)` | Append a typed shape. |
| `clearShapes(layerId?)` | Empty the targeted shapes layer. |
| **Layers — explicit composition** | |
| `addLayer(layer)` | Push a typed layer onto the stack. |
| `setLayers(layers)` | Replace the layer stack. |
| `clearLayers()` | Empty the layer stack (also drops the implicit defaults). |
| `getLayer(id)` | Returns the layer with that id, or `undefined`. |
| **Picker** | |
| `setPickMode(config)` | Sets `mode='pick'` and `pick=config`. |
| **Inherited** | |
| `getContent()` / `serve()` / `toJSON()` / `setProcess(...)` etc. | From `BaseView`. |

## Renderer compliance matrix

Renderers SHOULD report their compliance level against this matrix in their docs. A renderer is **conformant** if it implements every MUST, fails gracefully on every MAY (unknown values are no-ops, never crashes), and documents every SHOULD it skips.

| Feature | Level |
|---|---|
| `title`, `intro` | MUST |
| `markers` shorthand | MUST |
| `shapes` shorthand (Polygon, Circle, Polyline) | MUST |
| `viewport.{center, zoom}` | MUST |
| `viewport.fitMarkers` | MUST |
| `viewport.bounds` | SHOULD |
| `viewport.{minZoom, maxZoom}` | SHOULD |
| `viewport.{bearing, pitch}` | MAY |
| `basemap` | SHOULD (must accept the value, may render best-effort) |
| `controls.zoom` | MUST |
| `controls.userLocation` | SHOULD |
| `controls.compass` | SHOULD |
| `controls.layerToggle` | SHOULD |
| `controls.{scale, fullscreen, attribution}` | MAY |
| `marker.{icon, color, size, selected}` | SHOULD (icon catalog), MUST not crash on unknown values |
| `marker.action` | MUST |
| `marker.popup` | SHOULD |
| `shape.action` | SHOULD |
| `Rectangle` shape | SHOULD |
| `layers[]` (markers, shapes) | MUST |
| `layers[]` heatmap | SHOULD |
| `layers[]` tiles | SHOULD |
| `layers[]` geojson | SHOULD |
| `layer.{visible, toggleable, zIndex, minZoom, maxZoom}` | MUST for the layer types it supports |
| `layer.cluster` (markers) | SHOULD |
| `mode: 'pick'` | SHOULD |
| `emptyMessage` | MUST |

## Validation rules (SDK side)

- `lat ∈ [-90, 90]`, `lon ∈ [-180, 180]`. Reject otherwise.
- A `Polygon` requires `points.length ≥ 3`. A `Polyline` requires `points.length ≥ 2`.
- `Circle.radius > 0`.
- `Rectangle.sw.lat ≤ ne.lat`, `sw.lon ≤ ne.lon`.
- `viewport.zoom ∈ [0, 22]`. `bearing ∈ [0, 360)`. `pitch ∈ [0, 60]`.
- A `MarkersLayer` requires `markers.length ≥ 1`; a `ShapesLayer` requires `shapes.length ≥ 1`; a `HeatmapLayer` requires `points.length ≥ 1`.
- Layer `id` values must be unique within `layers[]`.
- `mode === 'pick'` requires `pick.submitUrl`.
- A `mode: 'view'` view whose `layers[]` is empty (or contains only zero-drawable layers) requires `emptyMessage`. In `mode: 'pick'` mode, layers are optional context; the user-placed marker is the data.

## Complete example

```json
{
  "id": "logistics",
  "type": "Map",
  "content": {
    "title": "Logistique – Région du Centre",
    "intro": "Aperçu en temps réel des points de livraison et zones de couverture.",
    "basemap": "auto",
    "viewport": { "fitMarkers": true, "minZoom": 6, "maxZoom": 18 },
    "controls": {
      "zoom": true, "compass": true, "userLocation": true,
      "layerToggle": true, "scale": true
    },
    "layers": [
      {
        "id": "stores",
        "type": "markers",
        "name": "Boutiques",
        "legendIcon": "store",
        "cluster": true,
        "markers": [
          {
            "id": "store-lome",
            "location": { "lat": 6.1319, "lon": 1.2228 },
            "title": "Boutique Lomé Centre",
            "description": "Ouvert 8h–20h",
            "icon": "store",
            "color": "#1A73E8",
            "action": { "method": "GET", "url": "/api/stores/lome" }
          }
        ]
      },
      {
        "id": "coverage",
        "type": "shapes",
        "name": "Zone de livraison",
        "visible": true,
        "toggleable": true,
        "zIndex": -1,
        "shapes": [
          {
            "id": "delivery-zone",
            "type": "Polygon",
            "points": [
              { "lat": 6.20, "lon": 1.18 },
              { "lat": 6.20, "lon": 1.30 },
              { "lat": 6.05, "lon": 1.30 },
              { "lat": 6.05, "lon": 1.18 }
            ],
            "config": { "fillColor": "#34A853", "fillOpacity": 0.15, "strokeColor": "#34A853", "strokeWidth": 2 }
          }
        ]
      },
      {
        "id": "traffic",
        "type": "heatmap",
        "name": "Trafic",
        "visible": false,
        "points": [
          { "lat": 6.13, "lon": 1.22, "intensity": 0.9 },
          { "lat": 6.14, "lon": 1.23, "intensity": 0.6 }
        ]
      }
    ]
  },
  "metadata": { "version": "2.0.0", "createdAt": "2026-04-26T08:00:00.000Z" }
}
```

## Changelog

See [map-view-changelog.md](map-view-changelog.md) — high-level diff against v1 and the rationale for each change.
