"""
MediaView - A view for displaying audio and video resources
"""

from typing import Optional
from datetime import datetime

from ..core.base_view import BaseView
from ..types.models import MediaItem, MediaKind, MediaSource


class MediaView(BaseView):
    """View for grouping audio and video resources"""

    def __init__(self, view_id: str, title: str, process_id: Optional[str] = None):
        super().__init__(
            {
                "id": view_id,
                "type": "Media",
                "process_id": process_id,
                "metadata": {
                    "version": "1.0.0",
                    "created_at": datetime.now(),
                },
            }
        )

        self.content = {
            "title": title,
            "intro": "",
            "items": [],
        }

    def set_intro(self, intro: str) -> "MediaView":
        """Set optional lead text for the media playlist section"""
        return self._set_intro_text("intro", intro)

    def add_media_item(self, item: MediaItem) -> "MediaView":
        """Register a ready-to-play media entry"""
        if not item.id or not item.kind or not item.sources or len(item.sources) == 0:
            raise ValueError(
                "Media item requires an id, type, and at least one source"
            )

        item_dict = {
            "id": item.id.strip(),
            "kind": item.kind,
            "title": item.title.strip() if item.title else None,
            "description": item.description.strip() if item.description else None,
            "poster": item.poster.strip() if item.poster else None,
            "autoplay": item.autoplay,
            "loop": item.loop,
            "controls": item.controls if item.controls is not None else True,
            "sources": [
                self._normalize_source(source) for source in item.sources
            ],
        }

        if item.meta:
            item_dict["meta"] = item.meta

        self.content["items"].append(item_dict)
        return self

    def create_media(
        self,
        id: str,
        kind: MediaKind,
        src: str,
        type: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        poster: Optional[str] = None,
        autoplay: Optional[bool] = None,
        loop: Optional[bool] = None,
        controls: Optional[bool] = None,
    ) -> MediaItem:
        """Create a media item"""
        primary_source = self._normalize_source(MediaSource(src=src, type=type))

        return MediaItem(
            id=id.strip(),
            kind=kind,
            title=title.strip() if title else None,
            description=description.strip() if description else None,
            poster=poster.strip() if poster else None,
            autoplay=autoplay,
            loop=loop,
            controls=controls if controls is not None else True,
            sources=[primary_source],
        )

    def clear_items(self) -> "MediaView":
        """Clear all items"""
        self.content["items"] = []
        return self

    def get_content(self):
        """Get the media content"""
        return self.content

    def _normalize_source(self, source: MediaSource) -> dict:
        """Normalize a media source"""
        trimmed_src = source.src.strip()
        if not trimmed_src:
            raise ValueError("Media source src cannot be empty")

        return {
            "src": trimmed_src,
            "type": source.type.strip() if source.type else None,
        }

