"""The only code that talks to GLADOS and the only place the token is attached (S-3, S-6)."""
import http.client
import json
import ssl
import urllib.error
import urllib.request

from .errors import AUTH_FAILED, INVALID_ARGUMENT, NOT_LOGGED_IN, UNAVAILABLE, UPSTREAM_ERROR, FacadeError

STATUS_ROUTE = "/api/cli/status"
QUERY_ROUTE = "/api/cli/queryExp"
ALLOWED_ROUTES = frozenset({STATUS_ROUTE, QUERY_ROUTE})

MAX_BODY_BYTES = 1_000_000
DEFAULT_TIMEOUT_SECONDS = 10
DEFAULT_MAX_RETRIES = 2


class TransportError(Exception):
    """Network-level failure. Deliberately carries no message."""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    # Returning None makes urllib raise HTTPError for 3xx instead of following it
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(
    urllib.request.ProxyHandler({}),
    urllib.request.HTTPSHandler(context=ssl.create_default_context()),
    _NoRedirect,
)


def urllib_transport(url: str, payload: dict, timeout: float):
    """POST JSON with verified TLS and no redirects or proxies. Returns (status, body bytes)."""
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with _OPENER.open(request, timeout=timeout) as response:
            return response.status, response.read(MAX_BODY_BYTES)
    except urllib.error.HTTPError as err:
        with err:
            return err.code, err.read(MAX_BODY_BYTES)
    except (urllib.error.URLError, http.client.HTTPException, OSError):
        raise TransportError() from None


class GladosClient:
    def __init__(self, base_url: str, token_loader, *, transport=urllib_transport,
                 timeout: float = DEFAULT_TIMEOUT_SECONDS, max_retries: int = DEFAULT_MAX_RETRIES):
        self._base_url = base_url
        self._token_loader = token_loader
        self._transport = transport
        self._timeout = timeout
        self._max_retries = max_retries

    def post(self, route: str, fields: dict) -> dict:
        """Make exactly one logical call to `route` (I-1) and return the parsed JSON object."""
        if route not in ALLOWED_ROUTES:
            raise FacadeError(INVALID_ARGUMENT)
        token = self._token_loader()
        if not token:
            raise FacadeError(NOT_LOGGED_IN)

        payload = dict(fields)
        payload["token"] = token
        url = self._base_url + route

        # Retry only transport failures; an HTTP response of any status is final
        for attempt in range(self._max_retries + 1):
            try:
                status, body = self._transport(url, payload, self._timeout)
                break
            except TransportError:
                if attempt == self._max_retries:
                    raise FacadeError(UNAVAILABLE) from None
        # Fail closed if upstream ever echoes the credential back (S-3)
        if token.encode("utf-8") in body:
            raise FacadeError(UPSTREAM_ERROR)
        return _parse_response(status, body)


def _parse_response(status: int, body: bytes) -> dict:
    if status in (401, 403):
        raise FacadeError(AUTH_FAILED)
    if status == 400:
        raise FacadeError(INVALID_ARGUMENT)
    if status != 200:
        raise FacadeError(UPSTREAM_ERROR)
    try:
        parsed = json.loads(body)
    except (ValueError, UnicodeDecodeError):
        raise FacadeError(UPSTREAM_ERROR) from None
    if not isinstance(parsed, dict):
        raise FacadeError(UPSTREAM_ERROR)
    return parsed
