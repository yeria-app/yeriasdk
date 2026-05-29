"""
CarouselView - A view for displaying carousel slides
"""

from typing import Optional, Dict, Any
from datetime import datetime

from ..core.base_view import BaseView
from ..types.models import CarouselSettings, CarouselSlide, CardAction, HttpMethod, CardActionVariant
from ..errors.exceptions import MissingRequiredParameterError, ElementNotFoundError


class CarouselView(BaseView):
    """View for displaying carousel slides"""

    def __init__(self, view_id: str, title: str, process_id: Optional[str] = None):
        super().__init__(
            {
                "id": view_id,
                "type": "Carousel",
                "process_id": process_id,
                "metadata": {
                    "version": "1.0.0",
                    "created_at": datetime.now(),
                },
            }
        )

        self.content = {
            "title": title,
            "subtitle": "",
            "slides": [],
            "settings": {
                "autoplay": False,
                "intervalMs": 6000,
                "loop": True,
                "showIndicators": True,
            },
        }

    def set_subtitle(self, subtitle: str) -> "CarouselView":
        """Set optional subtitle shown beneath the carousel heading"""
        return self._set_intro_text("subtitle", subtitle)

    def set_settings(self, settings: CarouselSettings | Dict[str, Any]) -> "CarouselView":
        """Override default autoplay and indicator behaviour"""
        if isinstance(settings, dict):
            self.content["settings"] = {
                "autoplay": settings.get("autoplay", False),
                "intervalMs": settings.get("intervalMs", 6000),
                "loop": settings.get("loop", True),
                "showIndicators": settings.get("showIndicators", True),
            }
        else:
            self.content["settings"] = {
                "autoplay": settings.autoplay,
                "intervalMs": settings.interval_ms,
                "loop": settings.loop,
                "showIndicators": settings.show_indicators,
            }
        return self

    def add_slide(self, slide: CarouselSlide | Dict[str, Any]) -> "CarouselView":
        """Append a prepared slide to the carousel sequence"""

        # Handle dictionary input
        if isinstance(slide, dict):
            slide_id = slide.get("id", "")
            slide_title = slide.get("title", "")

            if not slide_id or not slide_title:
                raise MissingRequiredParameterError("slide id and title")

            slide_dict = {
                "id": slide_id.strip(),
                "title": slide_title.strip(),
                "description": slide.get("description", "").strip() if slide.get("description") else None,
                "badge": slide.get("badge", "").strip() if slide.get("badge") else None,
            }

            if slide.get("image"):
                img = slide["image"]
                slide_dict["image"] = {
                    "url": img.get("url", ""),
                    "alt": img.get("alt", ""),
                }

            self.content["slides"].append(slide_dict)
            return self

        # Handle CarouselSlide object (original logic)
        if not slide.id or not slide.title:
            raise MissingRequiredParameterError("slide id and title")

        slide_dict = {
            "id": slide.id.strip(),
            "title": slide.title.strip(),
            "description": slide.description.strip() if slide.description else None,
            "badge": slide.badge.strip() if slide.badge else None,
        }

        if slide.image:
            slide_dict["image"] = {
                "url": slide.image.url,
                "alt": slide.image.alt,
            }

        if slide.actions:
            slide_dict["actions"] = [
                {
                    "text": action.text,
                    "method": action.method,
                    "confirmMessage": action.confirm_message,
                    "href": action.href,
                    "icon": action.icon,
                    "variant": action.variant,
                }
                for action in slide.actions
            ]

        if slide.meta:
            slide_dict["meta"] = slide.meta

        self.content["slides"].append(slide_dict)
        return self

    def create_slide(
        self,
        id: str,
        title: str,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        image_alt: Optional[str] = None,
        badge: Optional[str] = None,
    ) -> CarouselSlide:
        """Create a slide object"""
        slide = CarouselSlide(
            id=id.strip(),
            title=title.strip(),
            description=description.strip() if description else None,
            badge=badge.strip() if badge else None,
        )

        if image_url:
            from ..types.models import CardImage
            slide.image = CardImage(url=image_url.strip(), alt=image_alt.strip() if image_alt else None)

        return slide

    def add_slide_action(
        self,
        slide_id: str,
        text: str,
        method: HttpMethod = "POST",
        confirm_message: Optional[str] = None,
        href: Optional[str] = None,
        icon: Optional[str] = None,
        variant: Optional[CardActionVariant] = None,
    ) -> "CarouselView":
        """Push an action button for a given slide id"""
        slides = self.content["slides"]
        slide = next((s for s in slides if s.get("id") == slide_id), None)
        if not slide:
            raise ElementNotFoundError(0, slide_id)

        if "actions" not in slide:
            slide["actions"] = []

        action = {
            "text": text.strip(),
            "method": method,
            "confirmMessage": confirm_message,
            "href": href.strip() if href else None,
            "icon": icon.strip() if icon else None,
            "variant": variant,
        }

        slide["actions"].append(action)
        return self

    def clear_slides(self) -> "CarouselView":
        """Clear all slides"""
        self.content["slides"] = []
        return self

    def get_content(self):
        """Get the carousel content"""
        return self.content

