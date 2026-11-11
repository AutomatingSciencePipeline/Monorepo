"""Authentication helpers for the backend API.

Two kinds of callers exist:

* Control-plane callers (the frontend). They present a Kubernetes ServiceAccount token that is bound
  to the backend audience. The backend validates it with the TokenReview API.
* Runners. Each runner Job gets a random token that is only valid for its own experiment. Only a hash
  of the token is stored, so a database dump does not reveal usable tokens.
"""
import datetime
import hashlib
import re
import secrets
import threading
import time
from typing import Dict, Iterable, Optional

import pymongo

RUNNER_TOKEN_COLLECTION = "runnerTokens"
EXPERIMENT_ID_PATTERN = re.compile(r"^[0-9a-f]{24}$")
JOB_NAME_PATTERN = re.compile(r"^runner-[0-9a-f]{24}$")

# Fields a runner may change on its own experiment, with the type each one must have
RUNNER_WRITABLE_FIELDS = {
    "status": str,
    "finished": bool,
    "finishedAtEpochMilliseconds": int,
    "startedAtEpochMillis": int,
    "totalExperimentRuns": int,
    "passes": int,
    "fails": int,
}
RUNNER_ALLOWED_STATUSES = ("RUNNING", "COMPLETED", "FAILED")
EMAIL_ALLOWED_STATUSES = ("COMPLETED", "FAILED", "ABORTED")


def is_valid_experiment_id(experiment_id) -> bool:
    """Experiment ids are MongoDB ObjectIds, which also makes them safe to use in a Job name"""
    return isinstance(experiment_id, str) and EXPERIMENT_ID_PATTERN.match(experiment_id) is not None


def is_valid_job_name(job_name) -> bool:
    return isinstance(job_name, str) and JOB_NAME_PATTERN.match(job_name) is not None


def is_allowed_runner_update(field, new_value) -> bool:
    """Runners may only write progress fields, never ownership or role fields"""
    expected_type = RUNNER_WRITABLE_FIELDS.get(field) if isinstance(field, str) else None
    if expected_type is None:
        return False
    # bool is a subclass of int, so it has to be rejected explicitly for the numeric fields
    if expected_type is int and isinstance(new_value, bool):
        return False
    if not isinstance(new_value, expected_type):
        return False
    if field == "status":
        return new_value in RUNNER_ALLOWED_STATUSES
    if expected_type is int:
        return new_value >= 0
    return True


def bearer_token(authorization_header: Optional[str]) -> Optional[str]:
    """Returns the token from an `Authorization: Bearer <token>` header, or None"""
    if not authorization_header:
        return None
    parts = authorization_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _token_collection(mongo_client: pymongo.MongoClient):
    return mongo_client["gladosdb"][RUNNER_TOKEN_COLLECTION]


def issue_runner_token(mongo_client: pymongo.MongoClient, experiment_id: str, ttl_seconds: int) -> str:
    """Creates a token that authorizes a runner to act on a single experiment"""
    collection = _token_collection(mongo_client)
    # MongoDB removes expired tokens on its own through this TTL index
    collection.create_index("expiresAt", expireAfterSeconds=0)
    collection.create_index("tokenHash", unique=True)
    token = secrets.token_urlsafe(32)
    now = datetime.datetime.now(datetime.timezone.utc)
    collection.insert_one({
        "tokenHash": hash_token(token),
        "experimentId": experiment_id,
        "createdAt": now,
        "expiresAt": now + datetime.timedelta(seconds=ttl_seconds),
        "emailSent": False,
    })
    return token


def experiment_for_runner_token(mongo_client: pymongo.MongoClient, token: Optional[str]) -> Optional[str]:
    """Returns the experiment id the token is valid for, or None if the token is unknown or expired"""
    if not token:
        return None
    document = _token_collection(mongo_client).find_one({"tokenHash": hash_token(token)})
    if document is None:
        return None
    expires_at = document.get("expiresAt")
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
        # The TTL index only runs about once a minute, so expiry is also checked here
        if expires_at <= datetime.datetime.now(datetime.timezone.utc):
            return None
    return document.get("experimentId")


def revoke_runner_tokens(mongo_client: pymongo.MongoClient, experiment_id: str) -> None:
    _token_collection(mongo_client).delete_many({"experimentId": experiment_id})


def revoke_runner_token(mongo_client: pymongo.MongoClient, token: str) -> None:
    _token_collection(mongo_client).delete_many({"tokenHash": hash_token(token)})


def claim_email_send(mongo_client: pymongo.MongoClient, token: str) -> bool:
    """Each runner token may trigger one notification email. Returns True if this call claimed it."""
    result = _token_collection(mongo_client).update_one(
        {"tokenHash": hash_token(token), "emailSent": {"$ne": True}},
        {"$set": {"emailSent": True}})
    return result.modified_count == 1


class ServiceAccountAuthenticator:
    """Validates control-plane callers by their Kubernetes ServiceAccount token.

    The caller sends a projected ServiceAccount token whose audience is the backend. The token is
    useless against the Kubernetes API itself, and runner Pods have no token at all.
    """

    def __init__(self, authentication_api, allowed_subjects: Iterable[str], audience: str,
                 cache_seconds: int = 30, max_cache_entries: int = 64):
        self._api = authentication_api
        self._allowed_subjects = frozenset(allowed_subjects)
        self._audience = audience
        self._cache_seconds = cache_seconds
        self._max_cache_entries = max_cache_entries
        self._cache: Dict[str, float] = {}
        self._lock = threading.Lock()

    def is_authorized(self, token: Optional[str]) -> bool:
        if not token:
            return False
        key = hash_token(token)
        now = time.monotonic()
        with self._lock:
            valid_until = self._cache.get(key)
            if valid_until is not None and valid_until > now:
                return True
        if not self._review(token):
            return False
        with self._lock:
            if len(self._cache) >= self._max_cache_entries:
                self._cache.clear()
            self._cache[key] = now + self._cache_seconds
        return True

    def _review(self, token: str) -> bool:
        body = {
            "apiVersion": "authentication.k8s.io/v1",
            "kind": "TokenReview",
            "spec": {"token": token, "audiences": [self._audience]},
        }
        try:
            review = self._api.create_token_review(body)
        except Exception:  # pylint: disable=broad-exception-caught
            # Fail closed: if the token cannot be checked, the caller is not let in
            return False
        status = getattr(review, "status", None)
        if status is None or not getattr(status, "authenticated", False):
            return False
        if self._audience not in (getattr(status, "audiences", None) or []):
            return False
        user = getattr(status, "user", None)
        return getattr(user, "username", None) in self._allowed_subjects
