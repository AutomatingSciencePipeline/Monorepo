"""Checks who is allowed to call which backend endpoint"""
import os
import unittest
from unittest import mock

from tests.fakes import FakeAuthenticationApi, FakeTokenCollection

os.environ.setdefault("MONGODB_PORT", "27017")

# app.py connects to the cluster and to MongoDB at import time, so both are stubbed out first
with mock.patch("kubernetes.config.load_incluster_config"), \
        mock.patch("modules.mongo.check_insert_default_experiments"):
    import app as backend
from modules import auth

EXPERIMENT_A = "a" * 24
EXPERIMENT_B = "b" * 24
FILE_A = "f" * 24
FRONTEND = "system:serviceaccount:default:glados-frontend"
RUNNER = "system:serviceaccount:default:glados-runner"

CONTROL_PLANE_ENDPOINTS = [
    ("get", "/queue", None),
    ("post", "/experiment", {"experiment": {"id": EXPERIMENT_A}}),
    ("post", "/cancelExperiment", {"jobName": "runner-" + EXPERIMENT_A}),
]
RUNNER_ENDPOINTS = [
    ("post", "/uploadResults", {"experimentId": EXPERIMENT_A, "results": "a,b"}),
    ("post", "/uploadZip", {"experimentId": EXPERIMENT_A, "encoded": "AAAA"}),
    ("post", "/uploadLog", {"experimentId": EXPERIMENT_A, "logContents": "log"}),
    ("get", "/downloadExpFile?fileId=" + FILE_A, None),
    ("post", "/getExperiment", {"experimentId": EXPERIMENT_A}),
    ("post", "/updateExperiment", {"experimentId": EXPERIMENT_A, "field": "passes", "newValue": 1}),
    ("post", "/sendExperimentEmail", {"experimentId": EXPERIMENT_A, "status": "COMPLETED"}),
]
# Ends the runner's session, so it is exercised separately from the list above
FINISH_ENDPOINT = ("post", "/runnerFinished", {})


class SynchronousExecutor:
    """Runs submitted work immediately so the test can look at the created Job"""
    _pending_work_items = {}

    def submit(self, function, *args):
        function(*args)


class BackendTestCase(unittest.TestCase):

    def setUp(self):
        self.tokens = FakeTokenCollection()
        self.experiments = {
            EXPERIMENT_A: {"creatorRole": "user", "file": FILE_A, "sendEmail": True, "creatorEmail": "a@example.com"},
            EXPERIMENT_B: {"creatorRole": "admin", "file": "e" * 24, "sendEmail": False},
        }
        self.batch_api = mock.Mock()
        self.updates = []
        self.uploads = []
        self.emails = []

        def get_experiment(experiment_id, _client):
            if experiment_id not in self.experiments:
                raise Exception("Could not find experiment!")
            return dict(self.experiments[experiment_id])

        def record_upload(kind):
            def upload(experiment_id, _contents, _client):
                self.uploads.append((kind, experiment_id))
                return "stored-id"
            return upload

        authenticator = auth.ServiceAccountAuthenticator(FakeAuthenticationApi({
            "frontend-token": (FRONTEND, ["glados-backend"]),
            "runner-sa-token": (RUNNER, ["glados-backend"]),
        }), [FRONTEND], "glados-backend")

        patches = [
            mock.patch.object(auth, "_token_collection", return_value=self.tokens),
            mock.patch.object(backend, "controlPlaneAuth", authenticator),
            mock.patch.object(backend, "BATCH_API", self.batch_api),
            mock.patch.object(backend, "executor", SynchronousExecutor()),
            mock.patch.object(backend, "get_experiment", get_experiment),
            mock.patch.object(backend, "update_exp_value", lambda exp, field, value, _client: self.updates.append((exp, field, value))),
            mock.patch.object(backend, "upload_experiment_aggregated_results", record_upload("results")),
            mock.patch.object(backend, "upload_experiment_zip", record_upload("zip")),
            mock.patch.object(backend, "upload_log_file", record_upload("log")),
            mock.patch.object(backend, "download_experiment_file", lambda file_id, _client: b"file-bytes"),
            mock.patch.object(backend, "send_experiment_email", lambda experiment, status: self.emails.append((experiment["creatorEmail"], status)) or True),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

        self.client = backend.flaskApp.test_client()
        self.token_a = auth.issue_runner_token(None, EXPERIMENT_A, 600)
        self.token_b = auth.issue_runner_token(None, EXPERIMENT_B, 600)

    def call(self, method, path, body=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        if method == "get":
            return self.client.get(path, headers=headers)
        return self.client.post(path, json=body, headers=headers)


class TestControlPlaneEndpoints(BackendTestCase):

    def test_anonymous_callers_are_rejected(self):
        for method, path, body in CONTROL_PLANE_ENDPOINTS:
            self.assertEqual(self.call(method, path, body).status_code, 401, path)
        self.batch_api.create_namespaced_job.assert_not_called()
        self.batch_api.delete_namespaced_job.assert_not_called()

    def test_runners_are_rejected(self):
        # Neither a runner's experiment token nor a runner ServiceAccount token opens the control plane
        for token in (self.token_a, "runner-sa-token", "made-up"):
            for method, path, body in CONTROL_PLANE_ENDPOINTS:
                self.assertEqual(self.call(method, path, body, token).status_code, 401, (path, token))
        self.batch_api.create_namespaced_job.assert_not_called()
        self.batch_api.delete_namespaced_job.assert_not_called()

    def test_frontend_is_accepted(self):
        for method, path, body in CONTROL_PLANE_ENDPOINTS:
            self.assertEqual(self.call(method, path, body, "frontend-token").status_code, 200, path)

    def test_starting_an_experiment_creates_a_job_with_a_fresh_token(self):
        response = self.call("post", "/experiment", {"experiment": {"id": EXPERIMENT_A}}, "frontend-token")

        self.assertEqual(response.status_code, 200)
        job = self.batch_api.create_namespaced_job.call_args.kwargs["body"]
        self.assertEqual(job["metadata"]["name"], "runner-" + EXPERIMENT_A)
        env = {entry["name"]: entry.get("value") for entry in job["spec"]["template"]["spec"]["containers"][0]["env"]}
        self.assertEqual(auth.experiment_for_runner_token(None, env["RUNNER_TOKEN"]), EXPERIMENT_A)
        self.assertNotEqual(env["RUNNER_TOKEN"], self.token_a)

    def test_runner_privileges_follow_the_role_stored_in_the_database(self):
        # The request claims admin, but experiment A was created by a normal user
        self.call("post", "/experiment", {"experiment": {"id": EXPERIMENT_A, "creatorRole": "admin"}, "creatorRole": "admin"}, "frontend-token")
        job_a = self.batch_api.create_namespaced_job.call_args.kwargs["body"]
        self.call("post", "/experiment", {"experiment": {"id": EXPERIMENT_B}}, "frontend-token")
        job_b = self.batch_api.create_namespaced_job.call_args.kwargs["body"]

        self.assertIs(job_a["spec"]["template"]["spec"]["securityContext"]["runAsNonRoot"], True)
        self.assertEqual(job_b["spec"]["template"]["spec"]["securityContext"]["runAsUser"], 0)

    def test_invalid_or_unknown_experiments_are_not_started(self):
        cases = [
            ({"experiment": {"id": "../../etc"}}, 400), ({"experiment": {}}, 400), ({}, 400), ([], 400),
            ({"experiment": {"id": "c" * 24}}, 404),
        ]
        for body, expected in cases:
            self.assertEqual(self.call("post", "/experiment", body, "frontend-token").status_code, expected, body)
        self.batch_api.create_namespaced_job.assert_not_called()

    def test_cancel_only_deletes_runner_jobs_and_revokes_the_token(self):
        for job_name in ("glados-backend", "runner-nope", None):
            self.assertEqual(self.call("post", "/cancelExperiment", {"jobName": job_name}, "frontend-token").status_code, 400)
        self.batch_api.delete_namespaced_job.assert_not_called()

        self.call("post", "/cancelExperiment", {"jobName": "runner-" + EXPERIMENT_A}, "frontend-token")

        self.assertEqual(self.batch_api.delete_namespaced_job.call_args.args[0], "runner-" + EXPERIMENT_A)
        self.assertIsNone(auth.experiment_for_runner_token(None, self.token_a))
        self.assertEqual(auth.experiment_for_runner_token(None, self.token_b), EXPERIMENT_B)


class TestRunnerEndpoints(BackendTestCase):

    def test_anonymous_callers_are_rejected(self):
        for method, path, body in RUNNER_ENDPOINTS:
            self.assertEqual(self.call(method, path, body).status_code, 401, path)
            self.assertEqual(self.call(method, path, body, "made-up").status_code, 401, path)
        self.assertEqual((self.updates, self.uploads, self.emails), ([], [], []))

    def test_frontend_token_is_not_a_runner_token(self):
        for method, path, body in RUNNER_ENDPOINTS:
            self.assertEqual(self.call(method, path, body, "frontend-token").status_code, 401, path)

    def test_runner_can_work_on_its_own_experiment(self):
        for method, path, body in RUNNER_ENDPOINTS:
            self.assertEqual(self.call(method, path, body, self.token_a).status_code, 200, path)
        self.assertEqual(self.updates, [(EXPERIMENT_A, "passes", 1)])
        self.assertEqual(sorted(self.uploads), [("log", EXPERIMENT_A), ("results", EXPERIMENT_A), ("zip", EXPERIMENT_A)])
        self.assertEqual(self.emails, [("a@example.com", "COMPLETED")])

    def test_runner_cannot_touch_another_experiment(self):
        # Runner B presents a valid token, but every request names experiment A
        for method, path, body in RUNNER_ENDPOINTS:
            self.assertEqual(self.call(method, path, body, self.token_b).status_code, 403, path)
        self.assertEqual((self.updates, self.uploads, self.emails), ([], [], []))

    def test_runner_cannot_change_protected_fields(self):
        for field, value in [("creatorRole", "admin"), ("creator", "me"), ("status", "CANCELLED"), ("file", FILE_A)]:
            body = {"experimentId": EXPERIMENT_A, "field": field, "newValue": value}
            self.assertEqual(self.call("post", "/updateExperiment", body, self.token_a).status_code, 403, field)
        self.assertEqual(self.updates, [])

    def test_expired_token_stops_working(self):
        auth.revoke_runner_tokens(None, EXPERIMENT_A)

        for method, path, body in RUNNER_ENDPOINTS:
            self.assertEqual(self.call(method, path, body, self.token_a).status_code, 401, path)

    def test_finished_runner_loses_its_token_but_others_keep_theirs(self):
        method, path, body = FINISH_ENDPOINT
        self.assertEqual(self.call(method, path, body).status_code, 401)
        self.assertEqual(self.call(method, path, body, "frontend-token").status_code, 401)

        self.assertEqual(self.call(method, path, body, self.token_a).status_code, 200)

        for method, path, body in RUNNER_ENDPOINTS + [FINISH_ENDPOINT]:
            self.assertEqual(self.call(method, path, body, self.token_a).status_code, 401, path)
        self.assertEqual(auth.experiment_for_runner_token(None, self.token_b), EXPERIMENT_B)

    def test_email_goes_to_the_stored_address_once(self):
        body = {"experimentId": EXPERIMENT_A, "status": "FAILED", "to": "victim@example.com", "creatorEmail": "victim@example.com"}

        self.assertEqual(self.call("post", "/sendExperimentEmail", body, self.token_a).status_code, 200)
        self.assertEqual(self.call("post", "/sendExperimentEmail", body, self.token_a).status_code, 429)

        self.assertEqual(self.emails, [("a@example.com", "FAILED")])

    def test_email_is_not_sent_when_the_user_did_not_ask_for_one(self):
        body = {"experimentId": EXPERIMENT_B, "status": "COMPLETED"}

        response = self.call("post", "/sendExperimentEmail", body, self.token_b)

        self.assertEqual(response.get_json(), {"sent": False})
        self.assertEqual(self.emails, [])

    def test_email_status_must_be_a_known_value(self):
        body = {"experimentId": EXPERIMENT_A, "status": "Click here: http://evil.example"}

        self.assertEqual(self.call("post", "/sendExperimentEmail", body, self.token_a).status_code, 400)
        self.assertEqual(self.emails, [])


class TestOpenEndpoints(BackendTestCase):

    def test_health_check_needs_no_token(self):
        self.assertEqual(self.client.get("/").status_code, 200)
