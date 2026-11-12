import importlib
import os
import unittest
from unittest import mock

from modules import utils


class TestRunnerBackendAuth(unittest.TestCase):

    def _reload_with_token(self, token):
        with mock.patch.dict(os.environ, {"RUNNER_TOKEN": token, "BACKEND_PORT": "5050"}):
            reloaded = importlib.reload(utils)
            tokenLeftInEnv = "RUNNER_TOKEN" in os.environ
        self.addCleanup(importlib.reload, utils)
        return reloaded, tokenLeftInEnv

    def test_token_is_sent_as_bearer_header(self):
        reloaded, _ = self._reload_with_token("secret-token")

        self.assertEqual(reloaded.backend_auth_headers(), {"Authorization": "Bearer secret-token"})

    def test_token_is_removed_from_the_environment(self):
        # Trial subprocesses inherit os.environ, so the token must not stay in it
        _, tokenLeftInEnv = self._reload_with_token("secret-token")

        self.assertFalse(tokenLeftInEnv)

    def test_every_experiment_call_carries_the_token(self):
        reloaded, _ = self._reload_with_token("secret-token")
        response = mock.Mock(status_code=200, ok=True)
        response.json.return_value = {"contents": {}, "id": "abc"}

        with mock.patch.object(reloaded.requests, "post", return_value=response) as post:
            reloaded.get_experiment_with_id("exp")
            reloaded.update_exp_value("exp", "passes", 1)
            reloaded.request_experiment_email("exp", "COMPLETED")
            reloaded._call_backend(reloaded.backend_url("/uploadResults"), {}, "uploaded")
            reloaded.release_runner_token()

        self.assertEqual(post.call_count, 5)
        for call in post.call_args_list:
            self.assertEqual(call.kwargs["headers"], {"Authorization": "Bearer secret-token"})

    def test_email_request_does_not_raise_when_backend_is_down(self):
        reloaded, _ = self._reload_with_token("secret-token")

        with mock.patch.object(reloaded.requests, "post", side_effect=ConnectionError("down")):
            reloaded.request_experiment_email("exp", "FAILED")
