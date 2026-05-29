# MapView spec changelog

## v2 — clean break

v2 is a clean rewrite of the MapView contract. Because no production data exists, there is no migration recipe — the JS/Python SDKs and the mobile renderer can implement v2 directly and the v1 surface is removed.

### What's gone

| v1 surface | Why it was removed |
|---|---|
| `content.overlays[]` (free-form `{ id, data: Record<string, unknown> }`) | The `data` blob was untyped, so renderers had to guess. v2 splits it into typed layer kinds: `shapes`, `heatmap`, `tiles`, `geojson`. |
| `addOverlay(id, data)` / `setOverlays(overlays)` | Replaced by `addLayer(layer)` / `setLayers(layers)`. |
| Polygon-via-overlay (the `{type:'polygon', coordinates:[...] }` pattern in v1's example) | There were two ways to draw a polygon (overlay payload vs. `MapShape`). v2 keeps only the typed `Polygon` shape. |
| `setOverlays`'s flat `overlays[]` array | Replaced by typed `layers[]`. |
| Implicit `content.markers[]` shorthand at the wire level | At the wire level there is now exactly one data path: `layers[]`. The SDK still exposes `addMarker(...)` as a convenience; it appends into a default markers layer behind the scenes. |
| Coordinate-array form (`[lat, lon]` or `[lon, lat]`) inside overlays | Banned. All points are `{ lat, lon }` objects, including inside GeoJSON layer payloads (the GeoJSON layer's `data` field is the only place RFC 7946's `[lon, lat]` is allowed, and only because that *is* RFC 7946). |

### What's new

- **`layers[]`** — typed, named, toggleable, z-ordered data containers. Five kinds: `markers`, `shapes`, `heatmap`, `tiles`, `geojson`.
- **`MapShape` discriminated union** — `Polygon`, `Circle`, `Polyline`, `Rectangle`, each with proper `ShapeStyle`. Replaces v1's stringly-typed overlay payloads.
- **Marker styling** — `color`, `size`, `selected`, `popup` (rich popup with optional image and inline action buttons).
- **Marker / shape `action`** — same `ActionRef` shape every other Yeria view uses. Routed through the existing JsonRenderer action dispatcher.
- **`viewport.fitMarkers` / `viewport.bounds`** — camera can be specified by data fit or bounds, not just `center+zoom`. `viewport.minZoom` / `maxZoom` cap user zoom.
- **`basemap`** — `'streets' | 'satellite' | 'terrain' | 'dark' | 'auto'`. `'auto'` follows the user's theme (matches the `dark` / `light` mode).
- **`controls.layerToggle`**, **`controls.scale`**, **`controls.fullscreen`**.
- **`mode: 'pick'`** + `MapPickConfig` — first-class location-picker flow. Renderer reuses the existing [`gps_map_picker_widget`](../../yeria-app/lib/presentation/shared/widgets/map_picker/gps_map_picker_widget.dart) on mobile.
- **`emptyMessage`** — explicit empty-state. v1 required ≥1 marker; v2 lets a backend say "no data, here's why."
- **Renderer compliance matrix** — every field tagged MUST / SHOULD / MAY so renderers can implement progressively without violating spec.
- **Breaking-change-friendly validation** — layer `id` uniqueness, `lat`/`lon` ranges, polygon ≥3 points, `viewport.bearing/pitch` ranges, etc. All enforced SDK-side at `serve()` time.

### What stays

- `{lat, lon}` field names. Short, unambiguous (we considered `latitude/longitude` to match `latlong2`, but the converter is one line — not worth the verbosity).
- The fluent builder API on `MapView` (chainable `setX(...)` / `addX(...)` methods).
- The view envelope: `{ id, type: 'Map', content, metadata?, process? }`.
- All inherited base methods: `setProcess`, `setNext`, `setPrev`, `setState`, `getState`, `serve`, `toJSON`.

### Implementation TODO (post-spec-approval)

These are *code* changes that the v2 spec triggers — none of them block adopting the spec doc itself, but they should land before any backend writes against v2.

- **`yeria-sdk/js/src/core/map-view.ts`** — replace v1 internals with v2 model. Convenience methods (`addMarker`, `addPolygon`, …) build/append to default layers.
- **`yeria-sdk/js/src/types/index.ts`** — new `MapLayer` discriminated union; `MapShape` gains `Rectangle`; `MapMarker` gains `color` / `size` / `selected` / `popup` / `action`; `MapViewport` gains `bounds` / `fitMarkers` / `minZoom` / `maxZoom`; `MapControls` gains `layerToggle` / `scale` / `fullscreen` / `attribution`; new `MapPickConfig`.
- **`yeria-sdk/py/yeriasdk/views/map_view.py`** + **`models.py`** — Python parity.
- **`yeria-sdk/js/tests/map-view.test.ts`** — net-new; cover validation rules from §"Validation rules".
- **`yeria-sdk/demo/src/routes/maps.ts`** — rewrite to exercise multi-layer (markers + shapes + heatmap + tile overlay), basemap toggle, marker actions, picker mode.
- **`yeria-app/lib/presentation/shared/widgets/map/`** — implement the v2 contract: shape rendering (`PolylineLayer` / `PolygonLayer` / `CircleLayer`), `controls` wiring (zoom / userLocation via `geolocator` / compass), layer toggle UI, marker action dispatch through the JsonRenderer action system, drop the Togo geo-fence, honor `marker.icon` / `color` / `size`. Reuse `gps_map_picker_widget` for `mode: 'pick'`.

### Why this is worth the rewrite

The v1 spec was marker-centric with a stringly-typed escape hatch (`overlays[].data: Record<string, unknown>`). In practice every renderer ended up parsing that bag differently or ignoring it (the mobile app never rendered overlays at all, even though the SDK demo emitted three of them). The v2 spec fixes the typing, gives backends primitives that map cleanly to native widgets on every renderer, and locks down the multi-layer / interaction story that production maps actually need (toggle panel, action dispatch, location picker, basemap selection, fit-to-data).
