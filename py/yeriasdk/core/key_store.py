"""
YeriaPublicKeys — provider-side helper for resolving the JWT ``kid`` header
of inbound Yeria-issued user tokens.

Mirrors the JS :class:`YeriaPublicKeys`. Fetches keys from
``GET /api/v1/public/registry/public-keys/{kid}`` on demand, caches the
result in memory, and only returns a PEM when the key is still trusted
(state ∈ {active, rotating}). Expired / unknown keys are negatively
cached so a flood of bad tokens does not hammer Yeria.

Typical usage::

    from yeriasdk import YeriaApp, YeriaPublicKeys

    keys = YeriaPublicKeys(base_url="https://yeria.app")
    claims = YeriaApp.verify_user_token_with_resolver(
        bearer, keys.get_by_kid, MY_SERVICE_ID
    )
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Dict, Optional

import requests

from ..errors import YeriaPlatformUnreachableError


@dataclass
class KeyLookup:
    # 'active' | 'rotating' | 'expired' | 'unknown' | 'unreachable'
    #   active/rotating — trusted, PEM present.
    #   expired/unknown — Yeria answered authoritatively; reject the token.
    #   unreachable     — Yeria could NOT be reached (network/timeout/5xx/
    #                     non-JSON body). No trust decision was possible;
    #                     distinct from unknown on purpose.
    state: str
    public_key: Optional[str] = None  # PEM, present only for active/rotating
    expires_at: Optional[str] = None  # ISO timestamp, present only for active/rotating
    # Populated only when state == 'unreachable'.
    reason: Optional[str] = None      # 'network' | 'http_error' | 'malformed_response'
    status_code: Optional[int] = None
    cause: Optional[Exception] = None


DEFAULT_TTL_SECONDS = 10 * 60
DEFAULT_ERROR_TTL_SECONDS = 5


class YeriaPublicKeys:
    """In-memory cache of Yeria service-issuing-key PEMs, keyed by ``kid``."""

    def __init__(
        self,
        *,
        base_url: str,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        error_ttl_seconds: int = DEFAULT_ERROR_TTL_SECONDS,
        http_get: Optional[Callable[[str, int], "requests.Response"]] = None,
        timeout: int = 5,
    ):
        if not base_url:
            raise ValueError("YeriaPublicKeys: base_url is required")
        self._base_url = base_url.rstrip("/")
        self._ttl_seconds = ttl_seconds
        # Short TTL for 'unreachable' so a transient blip does not fail every
        # token for the full ttl_seconds (see JS parity).
        self._error_ttl_seconds = error_ttl_seconds
        self._timeout = timeout
        # Allow tests to inject a fake. Defaults to requests.get.
        self._http_get = http_get or (lambda url, to: requests.get(url, timeout=to))
        # Cache: kid -> (lookup, cached_until_unix_seconds)
        self._cache: Dict[str, tuple[KeyLookup, float]] = {}

    def get_by_kid(self, kid: str) -> Optional[str]:
        """Resolve a kid to a PEM.

        - active/rotating → the PEM string.
        - expired/unknown → ``None``. Yeria answered authoritatively that the
          key is not trusted; the caller must REJECT the token (401).
        - unreachable → raises :class:`YeriaPlatformUnreachableError`. Yeria
          could not be reached, so no trust decision was possible; the caller
          must surface a 503, NOT a 401. As a resolver into
          ``verify_user_token_with_resolver`` this propagates out of verify so
          provider middleware can tell "cannot verify" from "invalid".
        """
        lookup = self._lookup(kid)
        if lookup.state == "unreachable":
            raise YeriaPlatformUnreachableError(
                kid,
                self._url_for(kid),
                lookup.reason or "network",
                lookup.status_code,
                lookup.cause,
            )
        return lookup.public_key

    def get_state(self, kid: str) -> str:
        """Resolve a kid to its trust state, INCLUDING ``unreachable``. Same
        network / cache behaviour as :meth:`get_by_kid` but never raises —
        for callers that want to log / branch on the state (e.g. tell a
        platform outage from a genuinely unknown key without a try/except)."""
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
    def _url_for(self, kid: str) -> str:
        return f"{self._base_url}/api/v1/public/registry/public-keys/{kid}"

    def _lookup(self, kid: str) -> KeyLookup:
        if not isinstance(kid, str) or not kid:
            # Malformed input, not a platform problem — authoritative reject.
            return KeyLookup(state="unknown")
        now = time.time()
        cached = self._cache.get(kid)
        if cached and cached[1] > now:
            return cached[0]

        lookup = self._fetch(kid)
        # Transient (unreachable) results get the short error TTL; authoritative
        # results get the normal TTL.
        ttl = self._error_ttl_seconds if lookup.state == "unreachable" else self._ttl_seconds
        self._cache[kid] = (lookup, now + ttl)
        return lookup

    def _fetch(self, kid: str) -> KeyLookup:
        url = self._url_for(kid)
        try:
            res = self._http_get(url, self._timeout)
        except requests.RequestException as e:
            # Transport failure (DNS, connection refused, timeout). Yeria was
            # never reached — no decision about the key is possible.
            return KeyLookup(state="unreachable", reason="network", cause=e)

        # Yeria answers 200 with a state body for a known kid and 404 (still a
        # well-formed body) for a genuinely unknown one. Any OTHER non-2xx
        # (5xx, 502/503 gateway pages, 429, …) is the platform failing to
        # answer — treat as unreachable, not as an authoritative verdict.
        status = getattr(res, "status_code", None)
        if status is not None and not (200 <= status < 300) and status != 404:
            return KeyLookup(state="unreachable", reason="http_error", status_code=status)

        # A body that will not parse as JSON (e.g. an HTML error page served by
        # a proxy in front of Yeria) is NOT a trustworthy "unknown".
        try:
            body = res.json()
        except ValueError:
            return KeyLookup(state="unreachable", reason="malformed_response", status_code=status)

        result = _extract_result(body)
        if not isinstance(result, dict):
            return KeyLookup(state="unreachable", reason="malformed_response", status_code=status)

        state = result.get("state")
        # An unrecognised / missing state is a broken contract, not an
        # authoritative 'unknown' — surface it as unreachable so it is never
        # silently cached as a hard token rejection.
        if state not in ("active", "rotating", "expired", "unknown"):
            return KeyLookup(state="unreachable", reason="malformed_response", status_code=status)

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
