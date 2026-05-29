import { YeriaApp } from '../src/index';

/**
 * Démo pour l'ajout de formes sur MapView
 * Exécuter avec: npx ts-node examples/map-shapes-demo.ts
 */

const yeriaApp = new YeriaApp({
    appId: 'map-shapes-demo'
});

const mapView = yeriaApp.createMapView('shapes-map', 'Carte avec formes');

// 1. Ajouter un polygone (Zone de livraison)
mapView.addPolygon('delivery-zone', [
    { lat: 48.8600, lon: 2.3300 },
    { lat: 48.8700, lon: 2.3300 },
    { lat: 48.8700, lon: 2.3500 },
    { lat: 48.8600, lon: 2.3500 }
], {
    fillColor: '#FF0000',
    fillOpacity: 0.3,
    strokeColor: '#FF0000',
    strokeWidth: 2
});

// 2. Ajouter un cercle (Rayon d'action)
mapView.addCircle('action-radius', { lat: 48.8566, lon: 2.3522 }, 500, {
    fillColor: '#00FF00',
    fillOpacity: 0.2,
    strokeColor: '#008000',
    strokeWidth: 1
});

// 3. Ajouter une polyligne (Itinéraire)
mapView.addPolyline('route-path', [
    { lat: 48.8500, lon: 2.3400 },
    { lat: 48.8550, lon: 2.3450 },
    { lat: 48.8600, lon: 2.3500 }
], {
    strokeColor: '#0000FF',
    strokeWidth: 4,
    strokeOpacity: 0.8
});

// Servir la vue sécurisée
const response = yeriaApp.serve(mapView);

console.log('JSON de la MapView :');
console.log(JSON.stringify(response.view, null, 2));

console.log('\nVérification de l\'intégrité :', yeriaApp.verifyIntegrity(response));
