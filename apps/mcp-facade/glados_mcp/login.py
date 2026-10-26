"""GitHub OAuth device flow (RFC 8628), ported from the GLADOS CLI.

Runs as its own command in the user's terminal, never as an MCP tool, so the agent
never sees the device code exchange or the token.
"""
import json
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# Same public OAuth app as the GLADOS CLI (GLADOS_CLI/glados_cli.py)
CLIENT_ID = "Ov23livJkEfAtIMMnwIP"
SCOPE = "read:user user:email"
DEVICE_CODE_URL = "https://github.com/login/device/code"
ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"
REQUEST_TIMEOUT_SECONDS = 20

_SSL_CONTEXT = ssl.create_default_context()


class LoginError(Exception):
    pass


def _post_form(url: str, fields: dict) -> dict:
    request = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(fields).encode("ascii"),
        headers={"Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS, context=_SSL_CONTEXT) as response:
            return json.loads(response.read())
    except (urllib.error.URLError, OSError, ValueError) as err:
        raise LoginError(f"Could not reach GitHub ({type(err).__name__})") from None


def device_flow(post=_post_form, sleep=time.sleep, out=sys.stderr) -> str:
    """Walk the user through device authorization and return the access token."""
    start = post(DEVICE_CODE_URL, {"client_id": CLIENT_ID, "scope": SCOPE})
    try:
        device_code = start["device_code"]
        user_code = start["user_code"]
        verification_uri = start["verification_uri"]
        interval = int(start.get("interval", 5))
        expires_in = int(start.get("expires_in", 900))
    except (KeyError, TypeError, ValueError):
        raise LoginError("Unexpected response from GitHub when starting login") from None

    print(f"Open {verification_uri} and enter the code: {user_code}", file=out, flush=True)

    waited = 0
    while waited < expires_in:
        sleep(interval)
        waited += interval
        response = post(ACCESS_TOKEN_URL, {"client_id": CLIENT_ID, "device_code": device_code, "grant_type": GRANT_TYPE})
        token = response.get("access_token")
        if token:
            return token
        error = response.get("error")
        if error == "authorization_pending":
            continue
        if error == "slow_down":
            interval += 5
            continue
        raise LoginError(f"GitHub login failed: {error or 'unknown error'}")
    raise LoginError("GitHub login timed out before the code was entered")
