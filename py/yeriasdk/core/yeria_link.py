"""Canonical Yeria deeplink generator."""

import re
from typing import Literal
from urllib.parse import parse_qs, quote, unquote, urlparse

from ..errors.exceptions import InvalidParameterError

YeriaLinkFormat = Literal["https", "yeria"]


class YeriaLink:
    """Generate links that open a destination in Yeria."""

    _SERVICE_ID_PATTERN = r"^[A-Za-z0-9._~-]{1,128}$"

    @classmethod
    def service(cls, service_id: str, format: YeriaLinkFormat = "https") -> str:
        return cls._base(service_id, "s", format)

    @classmethod
    def component(
        cls,
        service_id: str,
        provider_path: str,
        format: YeriaLinkFormat = "https",
    ) -> str:
        path = cls._assert_provider_path(provider_path)
        return f"{cls._base(service_id, 'v', format)}?p={quote(path, safe='')}"

    @classmethod
    def chat(cls, service_id: str, format: YeriaLinkFormat = "https") -> str:
        return cls._base(service_id, "c", format)

    @classmethod
    def pin(cls, service_id: str, format: YeriaLinkFormat = "https") -> str:
        return cls._base(service_id, "p", format)

    @classmethod
    def subscribe(cls, service_id: str, format: YeriaLinkFormat = "https") -> str:
        return cls._base(service_id, "n", format)

    @classmethod
    def is_valid(cls, link: str) -> bool:
        try:
            trimmed = link.strip()
            if (
                not trimmed
                or not trimmed.lower().startswith(("https://", "yeria://"))
                or "\\" in trimmed
                or any(ord(char) <= 31 or ord(char) == 127 for char in trimmed)
            ):
                return False

            parsed = urlparse(trimmed)
            if parsed.fragment or parsed.username or parsed.password:
                return False
            if cls._has_noncanonical_route_path(parsed.path):
                return False

            if parsed.scheme == "yeria":
                if parsed.hostname != "dl" or parsed.port is not None:
                    return False
                segments = [part for part in parsed.path.split("/") if part]
            elif parsed.scheme == "https":
                if parsed.hostname != "yeria.app" or parsed.port not in (None, 443):
                    return False
                segments = [part for part in parsed.path.split("/") if part]
                if not segments or segments.pop(0) != "dl":
                    return False
            else:
                return False

            if len(segments) != 2:
                return False
            operation, service_id = segments
            if not cls._is_service_id(service_id):
                return False

            if operation == "s":
                return not parsed.query

            if operation == "v":
                query = parse_qs(parsed.query, keep_blank_values=True)
                paths = query.get("p")
                return (
                    len(query) == 1
                    and paths is not None
                    and len(paths) == 1
                    and cls._is_provider_path(paths[0])
                )

            return operation in ("c", "p", "n") and not parsed.query
        except ValueError:
            return False

    @staticmethod
    def _has_noncanonical_route_path(path: str) -> bool:
        if not path.startswith("/"):
            return True

        raw_segments = path[1:].split("/")
        if not raw_segments or any(not segment for segment in raw_segments):
            return True

        return any(unquote(segment) in (".", "..") for segment in raw_segments)

    @classmethod
    def _base(
        cls,
        service_id: str,
        operation: Literal["s", "p", "n", "c", "v"],
        format: YeriaLinkFormat,
    ) -> str:
        service_id = service_id.strip()
        if not cls._is_service_id(service_id):
            raise InvalidParameterError(
                "service_id",
                service_id,
                "Service ID must contain 1 to 128 URL-safe characters",
            )

        if format == "https":
            return f"https://yeria.app/dl/{operation}/{service_id}"
        if format == "yeria":
            return f"yeria://dl/{operation}/{service_id}"
        raise InvalidParameterError(
            "format", format, "Format must be 'https' or 'yeria'"
        )

    @classmethod
    def _assert_provider_path(cls, provider_path: str) -> str:
        path = provider_path.strip()
        if not cls._is_provider_path(path):
            raise InvalidParameterError(
                "provider_path",
                provider_path,
                "Provider path must be relative, non-empty, and contain no traversal or fragment",
            )
        return path

    @classmethod
    def _is_service_id(cls, service_id: str) -> bool:
        return re.fullmatch(cls._SERVICE_ID_PATTERN, service_id) is not None

    @staticmethod
    def _is_provider_path(path: str) -> bool:
        if not path or path.startswith("//") or "\\" in path or "#" in path:
            return False

        try:
            parsed = urlparse(path)
            if parsed.scheme or parsed.netloc or not parsed.path:
                return False
            return not any(
                unquote(segment) in (".", "..")
                for segment in parsed.path.split("/")
            )
        except ValueError:
            return False
