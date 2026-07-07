"""YeriaUI — the provider-to-mobile VIEW FACTORY.

A pure, KEYLESS, stateless builder namespace (a value/namespace, like the JS
``Math`` / ``JSON`` objects — never instantiated): ``create_xxx_view()`` returns
a fresh typed view builder, and ``from_json(json)`` rehydrates a typed
view from wire JSON. It holds NO private key and needs NO construction — use it
directly::

    from yeriasdk import YeriaUI, YeriaApp
    view = YeriaUI.create_form_view(form_id, title)
    view.add_field(...)
    return app.serve(view)            # signing lives on `app` (holds the key)

The build/sign split is by secret ownership: ``YeriaUI`` builds without any
credential; ``app`` (which holds the Ed25519 keypair) signs and talks to the
Yeria backend. Passing a ``YeriaUI``-built view to ``app.serve()`` is a role
handoff, not a round-trip on one object. Mirrors js/src/core/yeria-ui.ts.

Not: ``YeriaUI`` never signs, verifies, or reaches the network — all of that is
on ``YeriaApp``.
"""

from typing import Any, Dict, Optional

from .base_view import BaseView
from ..errors.exceptions import ConfigurationError


class YeriaUI:
    """Keyless view factory — call its static methods without instantiating."""

    # ── View factories ──────────────────────────────────────────────────
    @staticmethod
    def create_form_view(form_id: str, title: str, process_id: Optional[str] = None):
        from ..views.form_view import FormView
        return FormView(form_id, title, process_id)

    @staticmethod
    def create_reader_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.reader_view import ReaderView
        return ReaderView(view_id, title, process_id)

    @staticmethod
    def create_action_list_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.action_list_view import ActionListView
        return ActionListView(view_id, title, process_id)

    @staticmethod
    def create_action_grid_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.action_grid_view import ActionGridView
        return ActionGridView(view_id, title, process_id)

    @staticmethod
    def create_icon_grid_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.icon_grid_view import IconGridView
        return IconGridView(view_id, title, process_id)

    @staticmethod
    def create_qr_scan_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.qr_scan_view import QRScanView
        return QRScanView(view_id, title, process_id)

    @staticmethod
    def create_qr_display_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.qr_display_view import QRDisplayView
        return QRDisplayView(view_id, title, process_id)

    @staticmethod
    def create_message_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.message_view import MessageView
        return MessageView(view_id, title, process_id)

    @staticmethod
    def create_card_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.card_view import CardView
        return CardView(view_id, title, process_id)

    @staticmethod
    def create_carousel_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.carousel_view import CarouselView
        return CarouselView(view_id, title, process_id)

    @staticmethod
    def create_timeline_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.timeline_view import TimelineView
        return TimelineView(view_id, title, process_id)

    @staticmethod
    def create_media_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.media_view import MediaView
        return MediaView(view_id, title, process_id)

    @staticmethod
    def create_map_view(view_id: str, title: str, process_id: Optional[str] = None):
        from ..views.map_view import MapView
        return MapView(view_id, title, process_id)

    @staticmethod
    def from_json(json_view: Dict[str, Any]) -> BaseView:
        """Rehydrate a wire JSON payload into a typed, validated view instance.
        Dispatches on ``type`` to the matching view's ``from_json``. Pass the
        result to ``app.serve()``."""
        vtype = json_view.get("type") if isinstance(json_view, dict) else None
        from ..views.form_view import FormView
        from ..views.reader_view import ReaderView
        from ..views.action_list_view import ActionListView
        from ..views.action_grid_view import ActionGridView
        from ..views.icon_grid_view import IconGridView
        from ..views.qr_scan_view import QRScanView
        from ..views.qr_display_view import QRDisplayView
        from ..views.message_view import MessageView
        from ..views.card_view import CardView
        from ..views.carousel_view import CarouselView
        from ..views.timeline_view import TimelineView
        from ..views.media_view import MediaView
        from ..views.map_view import MapView

        dispatch = {
            "Form": FormView, "Reader": ReaderView, "ActionList": ActionListView,
            "ActionGrid": ActionGridView, "IconGrid": IconGridView, "QRScan": QRScanView,
            "QRDisplay": QRDisplayView, "Message": MessageView, "Card": CardView,
            "Carousel": CarouselView, "Timeline": TimelineView, "Media": MediaView, "Map": MapView,
        }
        cls = dispatch.get(vtype)
        if cls is None:
            raise ConfigurationError(f"from_json: unknown or missing view type {vtype!r}")
        return cls.from_json(json_view)

    @staticmethod
    def error(code: str, message: str, status: int = 400, invalid_params=None):
        """Build an UNSIGNED provider error body ``{"error": {...}}`` to return
        to the mobile client. Keyless — works with no ``YeriaApp`` (e.g. when the
        app failed to construct). The mobile reads ``error.code`` +
        ``error.invalid_params`` and localizes by code. Use
        ``app.serve_error(...)`` when you want the error signed."""
        from .provider_error import build_provider_error
        return build_provider_error(code, message, status, invalid_params)
