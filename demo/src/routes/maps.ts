import { Router, Request, Response } from 'express';
import { YeriaApp, YeriaUI } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-maps',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// MapView v2 demo — exercises every layer kind, marker styling, shape types,
// viewport bounds vs fitMarkers, basemap, layer toggle, and pick mode.

// ── Index — links to each demo flavour ────────────────────────────────
router.get('/', (req: Request, res: Response) => {
  const list = YeriaUI
    .createActionListView('maps-index', 'MapView')
    .setIntro('Chaque entrée ci-dessous illustre une facette du contrat MapView v2.');
  list.addAction('/api/maps/single',     'Single marker',          'Cas le plus simple : un seul marqueur, layer par défaut.', '📍', false);
  list.addAction('/api/maps/multi',      'Multi-layer',            'Stores + zones de couverture + heatmap trafic, panneau de toggle.', '🗂️', false);
  list.addAction('/api/maps/polygon',    'Polygon — zone',         'Une zone polygonale seule, contour + remplissage.', '🟦', false);
  list.addAction('/api/maps/shapes',     'Toutes les formes',      'Polygon, Circle, Polyline, Rectangle dans un seul layer.', '🔷', false);
  list.addAction('/api/maps/styling',    'Markers stylés',         'Couleurs, tailles, sélection, popup riche, click action.', '🎨', false);
  list.addAction('/api/maps/basemap',    'Basemap dark',           'Variante "dark" + viewport.bounds.', '🌑', false);
  list.addAction('/api/maps/pick',       'Picker mode',            'mode: "pick" — l\'utilisateur place un marqueur et soumet.', '🎯', false);
  list.addAction('/api/maps/empty',      'Empty state',            'Zéro données + emptyMessage.', '⬜', false);
  res.json(yeriaApp.serve(list));
});

// ── 1. Single marker, default layer ───────────────────────────────────
router.get('/single', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-single', 'MapView — un seul marqueur')
    .setIntro('Cas minimal. addMarker sans layerId → atterrit dans _default_markers.')
    .setViewport({ center: { lat: 6.1319, lon: 1.2228 }, zoom: 12 })
    .addMarker({
      id: 'lome',
      location: { lat: 6.1319, lon: 1.2228 },
      title: 'Lomé Centre',
      description: 'Capitale du Togo',
      icon: 'pin',
      action: { method: 'GET', url: '/api/maps/lome-detail' }
    });
  res.json(yeriaApp.serve(map));
});

// ── 2. Multi-layer composition ────────────────────────────────────────
router.get('/multi', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-multi', 'Logistique — Région du Centre')
    .setIntro('Trois layers nommés et toggleables. Le panneau de toggle apparaît grâce à controls.layerToggle.')
    .setBasemap('auto')
    .setViewport({ fitMarkers: true, minZoom: 6, maxZoom: 18 })
    .setControls({ zoom: true, compass: true, userLocation: true, layerToggle: true, scale: true });

  // Layer 1 — boutiques
  map.addLayer({
    id: 'stores',
    type: 'markers',
    name: 'Boutiques',
    legendIcon: 'store',
    cluster: true,
    markers: []
  });
  map.addMarkers([
    { id: 'lome',     location: { lat: 6.1319, lon: 1.2228 }, title: 'Boutique Lomé Centre',  icon: 'store', color: '#1A73E8' },
    { id: 'kara',     location: { lat: 9.5511, lon: 1.1862 }, title: 'Boutique Kara',         icon: 'store', color: '#1A73E8' },
    { id: 'sokode',   location: { lat: 8.9833, lon: 1.1333 }, title: 'Boutique Sokodé',       icon: 'store', color: '#1A73E8' }
  ], 'stores');

  // Layer 2 — zone de couverture livraison (forme)
  map.addLayer({
    id: 'coverage',
    type: 'shapes',
    name: 'Zone de livraison',
    visible: true,
    toggleable: true,
    zIndex: -1,
    shapes: []
  });
  map.addPolygon(
    'delivery-zone',
    [
      { lat: 9.80, lon: 0.80 },
      { lat: 9.80, lon: 1.50 },
      { lat: 5.80, lon: 1.50 },
      { lat: 5.80, lon: 0.80 }
    ],
    { fillColor: '#34A853', fillOpacity: 0.15, strokeColor: '#34A853', strokeWidth: 2 },
    'coverage'
  );

  // Layer 3 — heatmap trafic (off par défaut)
  map.addLayer({
    id: 'traffic',
    type: 'heatmap',
    name: 'Trafic',
    legendIcon: 'flame',
    visible: false,
    radius: 30,
    intensityMax: 1,
    points: [
      { lat: 6.13, lon: 1.22, intensity: 0.9 },
      { lat: 6.14, lon: 1.23, intensity: 0.7 },
      { lat: 9.55, lon: 1.18, intensity: 0.5 }
    ]
  });

  res.json(yeriaApp.serve(map));
});

// ── 2b. Single polygon — irregular shape ──────────────────────────────
// Dedicated polygon test with an irregular geometry (zig-zag boundary,
// concave vertices) — useful for verifying the renderer handles
// non-convex outlines and dense vertex counts without artefacts.
router.get('/polygon', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-polygon', 'Zone polygonale irrégulière')
    .setIntro('Polygone à géométrie irrégulière (concave, vertices denses) autour de la région maritime du Togo.')
    .setViewport({ fitMarkers: true })
    .addPolygon(
      'zone-irregular',
      [
        // Hand-traced irregular outline: jagged east coast + concave south-west.
        { lat: 6.2820, lon: 1.1100 },
        { lat: 6.2780, lon: 1.1480 },
        { lat: 6.2410, lon: 1.1610 },
        { lat: 6.2530, lon: 1.1980 },
        { lat: 6.2240, lon: 1.2150 },
        { lat: 6.2360, lon: 1.2520 },
        { lat: 6.2080, lon: 1.2730 },
        { lat: 6.2200, lon: 1.3110 },
        { lat: 6.1850, lon: 1.3340 },
        { lat: 6.1620, lon: 1.3210 },
        { lat: 6.1450, lon: 1.3490 },
        { lat: 6.1180, lon: 1.3380 },
        { lat: 6.1010, lon: 1.3070 },
        { lat: 6.0860, lon: 1.2620 },
        // Concave bay
        { lat: 6.1170, lon: 1.2380 },
        { lat: 6.0990, lon: 1.2180 },
        { lat: 6.1280, lon: 1.1950 },
        { lat: 6.0930, lon: 1.1730 },
        { lat: 6.0810, lon: 1.1340 },
        { lat: 6.1040, lon: 1.1010 },
        { lat: 6.1380, lon: 1.0860 },
        { lat: 6.1750, lon: 1.0710 },
        { lat: 6.2080, lon: 1.0820 },
        { lat: 6.2480, lon: 1.0920 },
      ],
      { fillColor: '#1A73E8', fillOpacity: 0.25, strokeColor: '#1A73E8', strokeWidth: 3 }
    )
    .addMarker({
      id: 'centroid',
      location: { lat: 6.1700, lon: 1.2100 },
      title: 'Région de référence',
      size: 'sm'
    });
  res.json(yeriaApp.serve(map));
});

// ── 3. All shape types in one shapes layer ────────────────────────────
router.get('/shapes', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-shapes', 'Toutes les formes')
    .setIntro('Polygon · Circle · Polyline · Rectangle — exercés en un seul layer.')
    .setViewport({ center: { lat: 6.20, lon: 1.20 }, zoom: 10 })
    .addPolygon('zone-a', [
      { lat: 6.30, lon: 1.10 }, { lat: 6.30, lon: 1.30 }, { lat: 6.10, lon: 1.30 }, { lat: 6.10, lon: 1.10 }
    ], { fillColor: '#EA4335', fillOpacity: 0.2, strokeColor: '#EA4335' })
    .addCircle('zone-b', { lat: 6.20, lon: 1.20 }, 5000, { fillColor: '#FBBC04', fillOpacity: 0.2 })
    .addPolyline('route-1', [
      { lat: 6.13, lon: 1.22 }, { lat: 6.18, lon: 1.25 }, { lat: 6.25, lon: 1.28 }
    ], { strokeColor: '#1A73E8', strokeWidth: 4 })
    .addRectangle('zone-c',
      { lat: 6.05, lon: 1.05 },
      { lat: 6.15, lon: 1.15 },
      { fillColor: '#9C27B0', fillOpacity: 0.2, strokeColor: '#9C27B0', dashed: true }
    );
  res.json(yeriaApp.serve(map));
});

// ── 4. Marker styling: color / size / selected / popup / action ──────
router.get('/styling', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-styling', 'Markers stylés')
    .setIntro('Couleur, taille, état sélectionné, popup riche, action serveur au clic.')
    .setViewport({ center: { lat: 6.1319, lon: 1.2228 }, zoom: 13 })
    .addMarker({
      id: 'flagship',
      location: { lat: 6.1319, lon: 1.2228 },
      title: 'Boutique Phare',
      description: 'Notre vitrine principale.',
      icon: 'store',
      color: '#1A73E8',
      size: 'lg',
      selected: true,
      popup: {
        title: 'Boutique Phare — Lomé',
        body: '**Ouvert** : 8h–20h · 7j/7\n\nPlus de 200 produits en stock.',
        image: 'img/map-marker.png',
        actions: [
          { method: 'GET',  url: '/api/stores/flagship/products' },
          { method: 'POST', url: '/api/stores/flagship/contact', body: { reason: 'visit' } }
        ]
      },
      action: { method: 'GET', url: '/api/stores/flagship' }
    })
    .addMarker({
      id: 'satellite-1',
      location: { lat: 6.1450, lon: 1.2300 },
      title: 'Antenne Nord',
      icon: 'pin',
      color: '#9AA0A6',
      size: 'sm'
    });
  res.json(yeriaApp.serve(map));
});

// ── 5. Dark basemap + viewport.bounds ─────────────────────────────────
router.get('/basemap', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-basemap', 'Basemap dark + bounds')
    .setBasemap('dark')
    .setViewport({
      bounds: { sw: { lat: 5.5, lon: 0.5 }, ne: { lat: 11.5, lon: 1.8 } }
    })
    .addMarker({ id: 'a', location: { lat: 6.1319, lon: 1.2228 }, title: 'Lomé' })
    .addMarker({ id: 'b', location: { lat: 9.5511, lon: 1.1862 }, title: 'Kara' });
  res.json(yeriaApp.serve(map));
});

// ── 6. Pick mode (location input) ────────────────────────────────────
router.get('/pick', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-pick', 'Sélection d\'un point de livraison')
    .setIntro('mode: "pick" — l\'utilisateur place un marqueur et confirme.')
    .setViewport({ center: { lat: 6.1319, lon: 1.2228 }, zoom: 13 })
    .setControls({ zoom: true, userLocation: true, compass: true })
    .setPickMode({
      prompt: 'Touchez la carte pour choisir votre point de livraison.',
      initialLocation: { lat: 6.1319, lon: 1.2228 },
      submitUrl: '/api/maps/pick/submit',
      submitMethod: 'POST',
      submitLabel: 'Confirmer ce point',
      payloadKey: 'deliveryLocation',
      bounds: { sw: { lat: 6.05, lon: 1.15 }, ne: { lat: 6.20, lon: 1.30 } }
    });
  res.json(yeriaApp.serve(map));
});

// Stub endpoint for the picker submission so the demo shows the round-trip.
router.post('/pick/submit', (req: Request, res: Response) => {
  const loc = (req.body && req.body.deliveryLocation) || null;
  res.json({
    received: loc,
    note: 'In a real backend, persist this and return the next view (often a Message or Form).'
  });
});

// ── 7. Empty state ────────────────────────────────────────────────────
router.get('/empty', (req: Request, res: Response) => {
  const map = YeriaUI
    .createMapView('map-empty', 'Aucune donnée')
    .setEmptyMessage('Aucun point n\'est disponible pour cette zone. Revenez plus tard.')
    .setViewport({ center: { lat: 6.1319, lon: 1.2228 }, zoom: 8 });
  res.json(yeriaApp.serve(map));
});

export default router;
