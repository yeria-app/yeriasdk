/**
 * Tests for MapView v2 — see specs/map-view.md.
 *
 * Covers: layer dispatch (default vs named), validation rules (GeoPoint
 * ranges, shape geometry, viewport constraints), and the wire format.
 */

import { MapView } from '../src/core/map-view';
import {
    DuplicateLayerIdError,
    InvalidGeoPointError,
    InvalidParameterError,
    InvalidViewportError,
    LayerNotFoundError,
    LayerTypeMismatchError,
    MissingRequiredParameterError
} from '../src/errors';

describe('MapView v2', () => {
    let view: MapView;

    beforeEach(() => {
        view = new MapView('map-test', 'Test Map');
    });

    // ─── basic envelope ────────────────────────────────────────────────

    describe('envelope', () => {
        it('serializes type "Map" with id and title', () => {
            view.addMarker({ id: 'a', location: { lat: 0, lon: 0 } });
            const json = view.toJSON();
            expect(json.type).toBe('Map');
            expect(json.id).toBe('map-test');
            expect((json.content as any).title).toBe('Test Map');
        });

        it('always exposes content.layers as an array', () => {
            // use getContent — toJSON() triggers serve()/validation
            expect(Array.isArray(view.getContent().layers)).toBe(true);
        });

        it('default controls include zoom + compass', () => {
            expect(view.getContent().controls).toEqual({
                zoom: true, compass: true, userLocation: false
            });
        });
    });

    // ─── default-layer dispatch ────────────────────────────────────────

    describe('default-layer dispatch (no layerId)', () => {
        it('addMarker auto-creates _default_markers layer on first call', () => {
            view.addMarker({ id: 'a', location: { lat: 1, lon: 2 } });
            const layers = (view.toJSON().content as any).layers;
            expect(layers).toHaveLength(1);
            expect(layers[0].id).toBe(MapView.DEFAULT_MARKERS_LAYER_ID);
            expect(layers[0].type).toBe('markers');
            expect(layers[0].toggleable).toBe(false);
            expect(layers[0].markers).toHaveLength(1);
        });

        it('repeated addMarker calls reuse the same default layer', () => {
            view.addMarker({ id: 'a', location: { lat: 1, lon: 2 } });
            view.addMarker({ id: 'b', location: { lat: 3, lon: 4 } });
            const layers = (view.toJSON().content as any).layers;
            expect(layers).toHaveLength(1);
            expect(layers[0].markers).toHaveLength(2);
        });

        it('addPolygon auto-creates _default_shapes layer (separate from markers)', () => {
            view.addMarker({ id: 'a', location: { lat: 1, lon: 2 } });
            view.addPolygon('zone', [
                { lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }
            ]);
            const layers = (view.toJSON().content as any).layers;
            expect(layers).toHaveLength(2);
            expect(layers.map((l: any) => l.id)).toEqual([
                MapView.DEFAULT_MARKERS_LAYER_ID,
                MapView.DEFAULT_SHAPES_LAYER_ID
            ]);
        });

        it('clearMarkers() empties the default layer without removing it', () => {
            view.addMarker({ id: 'a', location: { lat: 1, lon: 2 } });
            view.clearMarkers();
            const layers = view.getContent().layers;
            expect(layers).toHaveLength(1);
            expect((layers[0] as any).markers).toHaveLength(0);
        });
    });

    // ─── named-layer targeting ─────────────────────────────────────────

    describe('named-layer targeting (layerId argument)', () => {
        it('routes addMarker into the named layer', () => {
            view.addLayer({ id: 'stores', type: 'markers', name: 'Stores', markers: [] });
            view.addMarker({ id: 'a', location: { lat: 1, lon: 2 } }, 'stores');
            const layers = (view.toJSON().content as any).layers;
            expect(layers).toHaveLength(1);
            expect(layers[0].id).toBe('stores');
            expect(layers[0].markers).toHaveLength(1);
        });

        it('throws LayerNotFoundError when targeting an undeclared layer', () => {
            expect(() => view.addMarker(
                { id: 'a', location: { lat: 0, lon: 0 } },
                'unknown'
            )).toThrow(LayerNotFoundError);
        });

        it('throws LayerTypeMismatchError when addMarker targets a shapes layer', () => {
            view.addLayer({ id: 'zones', type: 'shapes', shapes: [] });
            expect(() => view.addMarker(
                { id: 'a', location: { lat: 0, lon: 0 } },
                'zones'
            )).toThrow(LayerTypeMismatchError);
        });

        it('throws LayerTypeMismatchError when addPolygon targets a markers layer', () => {
            view.addLayer({ id: 'pins', type: 'markers', markers: [] });
            expect(() => view.addPolygon(
                'p', [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }],
                undefined,
                'pins'
            )).toThrow(LayerTypeMismatchError);
        });
    });

    // ─── layer management ──────────────────────────────────────────────

    describe('layer management', () => {
        it('addLayer rejects duplicate ids', () => {
            view.addLayer({ id: 'x', type: 'markers', markers: [] });
            expect(() => view.addLayer(
                { id: 'x', type: 'shapes', shapes: [] }
            )).toThrow(DuplicateLayerIdError);
        });

        it('setLayers replaces the stack', () => {
            view.addMarker({ id: 'a', location: { lat: 0, lon: 0 } }); // creates default
            view.setLayers([
                { id: 'one', type: 'markers', markers: [{ id: 'x', location: { lat: 1, lon: 1 } }] }
            ]);
            const layers = (view.toJSON().content as any).layers;
            expect(layers).toHaveLength(1);
            expect(layers[0].id).toBe('one');
        });

        it('clearLayers removes everything', () => {
            view.addMarker({ id: 'a', location: { lat: 0, lon: 0 } });
            view.clearLayers();
            expect(view.getContent().layers).toEqual([]);
        });

        it('getLayer returns the named layer', () => {
            view.addLayer({ id: 'stores', type: 'markers', markers: [] });
            expect(view.getLayer('stores')?.id).toBe('stores');
            expect(view.getLayer('unknown')).toBeUndefined();
        });
    });

    // ─── GeoPoint validation ───────────────────────────────────────────

    describe('GeoPoint validation', () => {
        it('rejects lat outside [-90, 90]', () => {
            expect(() => view.addMarker(
                { id: 'a', location: { lat: 91, lon: 0 } }
            )).toThrow(InvalidGeoPointError);
            expect(() => view.addMarker(
                { id: 'b', location: { lat: -91, lon: 0 } }
            )).toThrow(InvalidGeoPointError);
        });

        it('rejects lon outside [-180, 180]', () => {
            expect(() => view.addMarker(
                { id: 'a', location: { lat: 0, lon: 181 } }
            )).toThrow(InvalidGeoPointError);
            expect(() => view.addMarker(
                { id: 'b', location: { lat: 0, lon: -181 } }
            )).toThrow(InvalidGeoPointError);
        });

        it('rejects non-numeric lat/lon', () => {
            expect(() => view.addMarker(
                { id: 'a', location: { lat: 'x' as any, lon: 0 } }
            )).toThrow(InvalidGeoPointError);
        });
    });

    // ─── shape validation ──────────────────────────────────────────────

    describe('shape validation', () => {
        it('Polygon needs ≥ 3 points', () => {
            expect(() => view.addPolygon('p', [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }])).toThrow(InvalidParameterError);
        });

        it('Polyline needs ≥ 2 points', () => {
            expect(() => view.addPolyline('l', [{ lat: 0, lon: 0 }])).toThrow(InvalidParameterError);
        });

        it('Circle requires positive radius', () => {
            expect(() => view.addCircle('c', { lat: 0, lon: 0 }, 0)).toThrow(InvalidParameterError);
            expect(() => view.addCircle('c', { lat: 0, lon: 0 }, -10)).toThrow(InvalidParameterError);
        });

        it('Rectangle sw must be south-west of ne', () => {
            expect(() => view.addRectangle(
                'r',
                { lat: 5, lon: 0 },   // sw with higher lat than ne
                { lat: 0, lon: 5 }
            )).toThrow(InvalidParameterError);
        });
    });

    // ─── viewport validation ───────────────────────────────────────────

    describe('viewport validation', () => {
        it('rejects zoom outside [0, 22]', () => {
            expect(() => view.setViewport({ zoom: -1 })).toThrow(InvalidViewportError);
            expect(() => view.setViewport({ zoom: 23 })).toThrow(InvalidViewportError);
        });

        it('rejects bearing outside [0, 360)', () => {
            expect(() => view.setViewport({ bearing: -1 })).toThrow(InvalidViewportError);
            expect(() => view.setViewport({ bearing: 360 })).toThrow(InvalidViewportError);
        });

        it('rejects pitch outside [0, 60]', () => {
            expect(() => view.setViewport({ pitch: 61 })).toThrow(InvalidViewportError);
        });

        it('rejects minZoom > maxZoom', () => {
            expect(() => view.setViewport({ minZoom: 10, maxZoom: 5 })).toThrow(InvalidViewportError);
        });

        it('rejects malformed bounds', () => {
            expect(() => view.setViewport({
                bounds: { sw: { lat: 5, lon: 5 }, ne: { lat: 0, lon: 0 } }
            })).toThrow(InvalidViewportError);
        });

        it('accepts a valid full viewport', () => {
            view.setViewport({
                center: { lat: 6.13, lon: 1.22 },
                zoom: 12,
                minZoom: 6,
                maxZoom: 18,
                bearing: 0,
                pitch: 0,
                fitMarkers: false
            });
            expect((view.getContent().viewport as any).zoom).toBe(12);
        });
    });

    // ─── pick mode ─────────────────────────────────────────────────────

    describe('pick mode', () => {
        it('setPickMode requires submitUrl', () => {
            expect(() => view.setPickMode({ submitUrl: '' } as any)).toThrow(MissingRequiredParameterError);
        });

        it('setPickMode flips content.mode and stores config', () => {
            view.setPickMode({ submitUrl: '/api/loc/pick', prompt: 'Pick a spot' });
            const c = view.getContent();
            expect(c.mode).toBe('pick');
            expect(c.pick?.submitUrl).toBe('/api/loc/pick');
        });

        it('view-mode requires drawable data or emptyMessage at serve()', () => {
            // empty content, view mode → must fail validation
            expect(() => view.build()).toThrow();
        });

        it('view-mode passes when emptyMessage is set even with no layers', () => {
            view.setEmptyMessage('No data yet.');
            expect(() => view.build()).not.toThrow();
        });

        it('pick-mode passes validation without drawable layers', () => {
            view.setPickMode({ submitUrl: '/api/loc/pick' });
            expect(() => view.build()).not.toThrow();
        });
    });

    // ─── multi-layer wire format ───────────────────────────────────────

    describe('multi-layer wire format', () => {
        it('serializes a stores + zones + heatmap composition correctly', () => {
            view
                .setBasemap('auto')
                .setViewport({ fitMarkers: true })
                .addLayer({
                    id: 'stores', type: 'markers', name: 'Stores',
                    markers: [], cluster: true
                })
                .addLayer({
                    id: 'zones', type: 'shapes', name: 'Coverage',
                    shapes: [], zIndex: -1
                })
                .addLayer({
                    id: 'traffic', type: 'heatmap', name: 'Traffic',
                    points: [{ lat: 6.13, lon: 1.22, intensity: 0.8 }],
                    visible: false
                });

            view.addMarker({ id: 'lome', location: { lat: 6.13, lon: 1.22 }, title: 'Lomé' }, 'stores');
            view.addPolygon('coverage-zone', [
                { lat: 6.0, lon: 1.0 }, { lat: 6.5, lon: 1.0 }, { lat: 6.5, lon: 1.5 }
            ], { fillColor: '#0f0' }, 'zones');

            const c = view.toJSON().content as any;
            expect(c.basemap).toBe('auto');
            expect(c.viewport.fitMarkers).toBe(true);
            expect(c.layers).toHaveLength(3);

            const stores = c.layers.find((l: any) => l.id === 'stores');
            expect(stores.markers).toHaveLength(1);
            expect(stores.cluster).toBe(true);

            const zones = c.layers.find((l: any) => l.id === 'zones');
            expect(zones.shapes).toHaveLength(1);
            expect(zones.shapes[0].type).toBe('Polygon');
            expect(zones.zIndex).toBe(-1);

            const traffic = c.layers.find((l: any) => l.id === 'traffic');
            expect(traffic.points).toHaveLength(1);
            expect(traffic.visible).toBe(false);
        });
    });
});
