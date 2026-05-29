"""
YeriaKeyStore — provider-side helper for resolving the JWT ``kid`` header
of inbound Yeria-issued user tokens.

Mirrors the JS :class:`YeriaKeyStore`. Fetches keys from
``GET /api/v1/public/registry/public-keys/{kid}`` on demand, caches the
result in memory, and only returns a PEM when the key is still trusted
(state ∈ {active, rotating}). Expired / unknown keys are negatively
cached so a flood of bad tokens does not hammer Yeria.

Typical usage::

    from yeriasdk import YeriaApp, YeriaKeyStore

    keys = YeriaKeyStore(base_url="https://yeria.app")
    claims = YeriaApp.verify_user_token_with_resolver(
        bearer, keys.get_by_kid, MY_SERVICE_ID
    )
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Dict, Optional

import requests


@dataclass
class KeyLookup:
    state: str                       # 'active' | 'rotating' | 'expired' | 'unknown'
    public_key: Optional[str] = None  # PEM, present only for active/rotating
    expires_at: Optional[str] = None  # ISO timestamp, present only for active/rotating


DEFAULT_TTL_SECONDS = 10 * 60


class YeriaKeyStore:
    """In-memory cache of Yeria service-issuing-key PEMs, keyed by ``kid``."""

    def __init__(
        self,
        *,
        base_url: str,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        http_get: Optional[Callable[[str, int], "requests.Response"]] = None,
        timeout: int = 5,
    ):
        if not base_url:
            raise ValueError("YeriaKeyStore: base_url is required")
        self._base_url = base_url.rstrip("/")
        self._ttl_seconds = ttl_seconds
        self._timeout = timeout
        # Allow tests to inject a fake. Defaults to requests.get.
        self._http_get = http_get or (lambda url, to: requests.get(url, timeout=to))
        # Cache: kid -> (lookup, cached_until_unix_seconds)
        self._cache: Dict[str, tuple[KeyLookup, float]] = {}

    def get_by_kid(self, kid: str) -> Optional[str]:
        """Resolve a kid to a PEM. Returns ``None`` when the key is
        expired or unknown — the caller should reject the inbound token
        in that case."""
        return self._lookup(kid).public_key

    def get_state(self, kid: str) -> str:
        """Resolve a kid to its trust state. Same network / cache
        behaviour as :meth:`get_by_kid`."""
        return self._lookup(kid).state

    def invalidate(self, kid: str) -> None:
        """Drop a single cache entry. Use after a verify failure to
        force a refetch on the retry — covers the case where Yeria
        rotated a key out from under the cache."""
        self._cache.pop(kid, None)

    def invalidate_all(self) -> None:
        """Drop the entire cache."""
        self._cache.clear()

    # ── internals ────────────────────────────────────────────────────────
    def _lookup(self, kid: str) -> KeyLookup:
        if not isinstance(kid, str) or not kid:
            return KeyLookup(state="unknown")
        now = time.time()
        cached = self._cache.get(kid)
        if cached and cached[1] > now:
            return cached[0]

        lookup = self._fetch(kid)
        self._cache[kid] = (lookup, now + self._ttl_seconds)
        return lookup

    def _fetch(self, kid: str) -> KeyLookup:
        url = f"{self._base_url}/api/v1/public/registry/public-keys/{kid}"
        try:
            res = self._http_get(url, self._timeout)
        except requests.RequestException:
            # Transport failure — surface as 'unknown' so the caller
            # rejects the inbound token. Still cached briefly to avoid
            # hot-looping.
            return KeyLookup(state="unknown")

        try:
            body = res.json()
        except ValueError:
            return KeyLookup(state="unknown")

        result = _extract_result(body)
        if not isinstance(result, dict):
            return KeyLookup(state="unknown")

        state = result.get("state", "unknown")
        if state in ("active", "rotating"):
            return KeyLookup(
                state=state,
                public_key=result.get("public_key"),
                expires_at=result.get("expires_at"),
            )
        return KeyLookup(state=state)


def _extract_result(body):
    """Extract ``result`` from a ``{success, message, result}`` envelope,
    or fall back to the top-level object when the platform returned a
    state-only body."""
    if not isinstance(body, dict):
        return None
    if isinstance(body.get("result"), dict):
        return body["result"]
    if isinstance(body.get("state"), str):
        return body
    return None
