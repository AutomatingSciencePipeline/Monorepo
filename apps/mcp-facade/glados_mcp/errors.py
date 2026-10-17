"""Fixed error codes. These are the only error text the agent ever sees (agentic plan 5.4)."""

NOT_LOGGED_IN = "NOT_LOGGED_IN"
AUTH_FAILED = "AUTH_FAILED"
NOT_FOUND = "NOT_FOUND"
INVALID_ARGUMENT = "INVALID_ARGUMENT"
UPSTREAM_ERROR = "UPSTREAM_ERROR"
UNAVAILABLE = "UNAVAILABLE"

ALL_CODES = frozenset({NOT_LOGGED_IN, AUTH_FAILED, NOT_FOUND, INVALID_ARGUMENT, UPSTREAM_ERROR, UNAVAILABLE})


class FacadeError(Exception):
    """Carries only an error code, never upstream text, so it is safe to surface."""

    def __init__(self, code: str):
        if code not in ALL_CODES:
            code = UPSTREAM_ERROR
        super().__init__(code)
        self.code = code


def error_result(code: str) -> dict:
    return {"ok": False, "error": code if code in ALL_CODES else UPSTREAM_ERROR}
