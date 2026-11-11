import datetime
import unittest
from unittest import mock

from modules import auth
from tests.fakes import FakeAuthenticationApi, FakeTokenCollection

EXPERIMENT_A = "a" * 24
EXPERIMENT_B = "b" * 24
FRONTEND = "system:serviceaccount:default:glados-frontend"
RUNNER = "system:serviceaccount:default:glados-runner"


class TestValidation(unittest.TestCase):

    def test_experiment_ids_must_be_object_ids(self):
        self.assertTrue(auth.is_valid_experiment_id(EXPERIMENT_A))
        for bad in ["", "abc", "A" * 24, "a" * 23, "a" * 24 + "; rm -rf /", None, 5, {"$ne": ""}]:
            self.assertFalse(auth.is_valid_experiment_id(bad), bad)

    def test_job_names_must_be_runner_jobs(self):
        self.assertTrue(auth.is_valid_job_name("runner-" + EXPERIMENT_A))
        for bad in ["glados-backend", "runner-", "runner-" + "z" * 24, EXPERIMENT_A, None]:
            self.assertFalse(auth.is_valid_job_name(bad), bad)

    def test_bearer_token_parsing(self):
        self.assertEqual(auth.bearer_token("Bearer abc"), "abc")
        self.assertEqual(auth.bearer_token("bearer abc"), "abc")
        for bad in [None, "", "abc", "Basic abc", "Bearer ", "Bearer"]:
            self.assertIsNone(auth.bearer_token(bad), bad)

    def test_runner_may_only_write_progress_fields(self):
        allowed = [("status", "RUNNING"), ("status", "COMPLETED"), ("status", "FAILED"), ("finished", True),
                   ("passes", 3), ("fails", 0), ("totalExperimentRuns", 10),
                   ("startedAtEpochMillis", 1700000000000), ("finishedAtEpochMilliseconds", 1700000000000)]
        for field, value in allowed:
            self.assertTrue(auth.is_allowed_runner_update(field, value), field)

    def test_runner_may_not_write_ownership_or_role_fields(self):
        rejected = [("creatorRole", "admin"), ("creator", "someone"), ("creatorEmail", "x@example.com"),
                    ("sendEmail", True), ("file", "c" * 24), ("sharedUsers", []), ("$where", "1"),
                    ("status", "CANCELLED"), ("status", 1), ("passes", "3"), ("passes", -1), ("passes", True),
                    ("finished", "yes"), (None, 1), ({"a": 1}, 1)]
        for field, value in rejected:
            self.assertFalse(auth.is_allowed_runner_update(field, value), (field, value))


class TestRunnerTokens(unittest.TestCase):

    def setUp(self):
        self.collection = FakeTokenCollection()
        patch = mock.patch.object(auth, "_token_collection", return_value=self.collection)
        patch.start()
        self.addCleanup(patch.stop)

    def test_token_maps_back_to_its_experiment_only(self):
        token_a = auth.issue_runner_token(None, EXPERIMENT_A, 60)
        token_b = auth.issue_runner_token(None, EXPERIMENT_B, 60)

        self.assertNotEqual(token_a, token_b)
        self.assertEqual(auth.experiment_for_runner_token(None, token_a), EXPERIMENT_A)
        self.assertEqual(auth.experiment_for_runner_token(None, token_b), EXPERIMENT_B)

    def test_only_a_hash_of_the_token_is_stored(self):
        token = auth.issue_runner_token(None, EXPERIMENT_A, 60)

        self.assertNotIn(token, str(self.collection.documents))
        self.assertEqual(self.collection.documents[0]["tokenHash"], auth.hash_token(token))

    def test_unknown_and_missing_tokens_are_rejected(self):
        auth.issue_runner_token(None, EXPERIMENT_A, 60)

        self.assertIsNone(auth.experiment_for_runner_token(None, "not-a-real-token"))
        self.assertIsNone(auth.experiment_for_runner_token(None, None))
        self.assertIsNone(auth.experiment_for_runner_token(None, ""))

    def test_expired_tokens_are_rejected(self):
        token = auth.issue_runner_token(None, EXPERIMENT_A, 60)
        self.collection.documents[0]["expiresAt"] = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=1)

        self.assertIsNone(auth.experiment_for_runner_token(None, token))

    def test_expiry_stored_without_timezone_is_read_as_utc(self):
        # MongoDB hands datetimes back without tzinfo unless the client is configured otherwise
        token = auth.issue_runner_token(None, EXPERIMENT_A, 60)
        self.collection.documents[0]["expiresAt"] = self.collection.documents[0]["expiresAt"].replace(tzinfo=None)

        self.assertEqual(auth.experiment_for_runner_token(None, token), EXPERIMENT_A)

    def test_revoking_removes_every_token_of_the_experiment(self):
        token_a = auth.issue_runner_token(None, EXPERIMENT_A, 60)
        token_b = auth.issue_runner_token(None, EXPERIMENT_B, 60)

        auth.revoke_runner_tokens(None, EXPERIMENT_A)

        self.assertIsNone(auth.experiment_for_runner_token(None, token_a))
        self.assertEqual(auth.experiment_for_runner_token(None, token_b), EXPERIMENT_B)

    def test_email_can_be_claimed_once_per_token(self):
        token = auth.issue_runner_token(None, EXPERIMENT_A, 60)

        self.assertTrue(auth.claim_email_send(None, token))
        self.assertFalse(auth.claim_email_send(None, token))


class TestServiceAccountAuthenticator(unittest.TestCase):

    def setUp(self):
        self.api = FakeAuthenticationApi({
            "frontend-token": (FRONTEND, ["glados-backend"]),
            "runner-token": (RUNNER, ["glados-backend"]),
            "frontend-api-token": (FRONTEND, ["https://kubernetes.default.svc"]),
        })
        self.authenticator = auth.ServiceAccountAuthenticator(self.api, [FRONTEND], "glados-backend")

    def test_frontend_token_for_the_backend_audience_is_accepted(self):
        self.assertTrue(self.authenticator.is_authorized("frontend-token"))

    def test_other_service_accounts_are_rejected(self):
        self.assertFalse(self.authenticator.is_authorized("runner-token"))

    def test_token_for_another_audience_is_rejected(self):
        self.assertFalse(self.authenticator.is_authorized("frontend-api-token"))

    def test_missing_and_unknown_tokens_are_rejected(self):
        self.assertFalse(self.authenticator.is_authorized(None))
        self.assertFalse(self.authenticator.is_authorized(""))
        self.assertFalse(self.authenticator.is_authorized("made-up"))

    def test_api_errors_fail_closed(self):
        self.api.create_token_review = mock.Mock(side_effect=RuntimeError("api server down"))

        self.assertFalse(self.authenticator.is_authorized("frontend-token"))

    def test_accepted_tokens_are_cached_but_rejections_are_not(self):
        self.authenticator.is_authorized("frontend-token")
        self.authenticator.is_authorized("frontend-token")
        self.assertEqual(self.api.reviews, 1)

        self.authenticator.is_authorized("made-up")
        self.authenticator.is_authorized("made-up")
        self.assertEqual(self.api.reviews, 3)

    def test_cache_entries_expire(self):
        authenticator = auth.ServiceAccountAuthenticator(self.api, [FRONTEND], "glados-backend", cache_seconds=0)

        authenticator.is_authorized("frontend-token")
        authenticator.is_authorized("frontend-token")

        self.assertEqual(self.api.reviews, 2)
