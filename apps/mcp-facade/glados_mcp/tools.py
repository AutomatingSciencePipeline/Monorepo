"""Tool logic: validate arguments, call one route, return only allowlisted fields (I-2, I-3, S-1)."""
import re

from .errors import AUTH_FAILED, INVALID_ARGUMENT, NOT_FOUND, UPSTREAM_ERROR, FacadeError, error_result
from .rest import QUERY_ROUTE, STATUS_ROUTE

EXP_ID_PATTERN = re.compile(r"[0-9a-f]{24}")
MAX_TITLE_LENGTH = 200

# Every field below was argued LOW sensitivity. Anything not listed is dropped (agentic plan 5.2).
# `tags` is left out on purpose: nothing needs it yet.
STATUS_FIELDS = ("status", "current_permutation", "total_permutations")
EXPERIMENT_FIELDS = ("id", "name", "status", "started_on", "current_permutation", "total_permutations")

_UPSTREAM_ERRORS = {"not_found": NOT_FOUND, "auth_error": AUTH_FAILED}
_SCALAR_TYPES = (str, int, float, bool)


def _pick(source: dict, fields) -> dict:
    """Copy allowlisted scalar fields that are present. Never adds or changes values (I-3)."""
    return {key: source[key] for key in fields if key in source and isinstance(source[key], _SCALAR_TYPES)}


def _upstream_failure(body: dict) -> dict:
    return error_result(_UPSTREAM_ERRORS.get(body.get("error"), UPSTREAM_ERROR))


def get_experiment_status(client, exp_id) -> dict:
    if not isinstance(exp_id, str) or not EXP_ID_PATTERN.fullmatch(exp_id):
        return error_result(INVALID_ARGUMENT)
    try:
        body = client.post(STATUS_ROUTE, {"eid": exp_id})
    except FacadeError as err:
        return error_result(err.code)
    if body.get("success") is not True:
        return _upstream_failure(body)
    result = {"ok": True}
    result.update(_pick(body, STATUS_FIELDS))
    return result


def list_experiments(client, title) -> dict:
    if not isinstance(title, str) or not title.strip() or len(title) > MAX_TITLE_LENGTH:
        return error_result(INVALID_ARGUMENT)
    try:
        body = client.post(QUERY_ROUTE, {"exp_title": title})
    except FacadeError as err:
        return error_result(err.code)
    if body.get("success") is not True:
        return _upstream_failure(body)
    matches = body.get("matches")
    if not isinstance(matches, list):
        return error_result(UPSTREAM_ERROR)
    experiments = [_pick(match, EXPERIMENT_FIELDS) for match in matches if isinstance(match, dict)]
    return {"ok": True, "experiments": experiments}
