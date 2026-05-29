import json
from yeriasdk import YeriaApp
from yeriasdk.core.yeria_app import YeriaAppConfig
from yeriasdk.types.models import GeoPoint, MapShapeConfig

def demo():
    # Initialisation avec YeriaAppConfig
    config = YeriaAppConfig(app_id="map-shapes-demo")
    app = YeriaApp(config)
    
    # Création de la vue Map
    map_view = app.create_map_view("shapes-map", "Carte avec formes Python")
    
    # 1. Ajouter un polygone (Zone de livraison)
    map_view.add_polygon("delivery-zone", [
        GeoPoint(lat=48.8600, lon=2.3300),
        GeoPoint(lat=48.8700, lon=2.3300),
        GeoPoint(lat=48.8700, lon=2.3500),
        GeoPoint(lat=48.8600, lon=2.3500)
    ], MapShapeConfig(
        fill_color="#FF0000",
        fill_opacity=0.3,
        stroke_color="#FF0000",
        stroke_width=2
    ))
    
    # 2. Ajouter un cercle (Rayon d'action)
    map_view.add_circle("action-radius", GeoPoint(lat=48.8566, lon=2.3522), 500, MapShapeConfig(
        fill_color="#00FF00",
        fill_opacity=0.2,
        stroke_color="#008000",
        stroke_width=1
    ))
    
    # 3. Ajouter une polyligne (Itinéraire)
    map_view.add_polyline("route-path", [
        GeoPoint(lat=48.8500, lon=2.3400),
        GeoPoint(lat=48.8550, lon=2.3450),
        GeoPoint(lat=48.8600, lon=2.3500)
    ], MapShapeConfig(
        stroke_color="#0000FF",
        stroke_width=4,
        stroke_opacity=0.8
    ))
    
    # Servir la vue sécurisée
    response = app.serve(map_view)
    
    print("JSON de la MapView (Python) :")
    print(json.dumps(response["view"], indent=2))
    
    print("\nRéponse complète :")
    print(json.dumps(response, indent=2))

if __name__ == "__main__":
    demo()
