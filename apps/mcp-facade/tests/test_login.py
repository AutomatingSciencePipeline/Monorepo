import io
import unittest

from glados_mcp.login import ACCESS_TOKEN_URL, CLIENT_ID, DEVICE_CODE_URL, LoginError, device_flow

START = {"device_code": "dev-123", "user_code": "ABCD-1234", "verification_uri": "https://github.com/login/device",
         "interval": 5, "expires_in": 30}


class ScriptedGitHub:
    def __init__(self, *poll_responses, start=None):
        self.start = START if start is None else start
        self.poll_responses = list(poll_responses)
        self.requests = []

    def __call__(self, url, fields):
        self.requests.append((url, fields))
        if url == DEVICE_CODE_URL:
            return self.start
        return self.poll_responses.pop(0)


class TestDeviceFlow(unittest.TestCase):
    def run_flow(self, github):
        out = io.StringIO()
        sleeps = []
        token = device_flow(post=github, sleep=sleeps.append, out=out)
        return token, out.getvalue(), sleeps

    def test_success_after_pending_and_slow_down(self):
        github = ScriptedGitHub({"error": "authorization_pending"}, {"error": "slow_down"}, {"access_token": "gho_x"})
        token, output, sleeps = self.run_flow(github)
        self.assertEqual(token, "gho_x")
        self.assertEqual(sleeps, [5, 5, 10])
        self.assertIn("ABCD-1234", output)
        self.assertNotIn("gho_x", output)
        self.assertEqual(github.requests[0], (DEVICE_CODE_URL, {"client_id": CLIENT_ID, "scope": "read:user user:email"}))
        self.assertEqual(github.requests[1][0], ACCESS_TOKEN_URL)

    def test_denied(self):
        with self.assertRaises(LoginError):
            self.run_flow(ScriptedGitHub({"error": "access_denied"}))

    def test_timeout(self):
        github = ScriptedGitHub(*[{"error": "authorization_pending"}] * 10)
        with self.assertRaises(LoginError):
            self.run_flow(github)

    def test_bad_start_response(self):
        with self.assertRaises(LoginError):
            self.run_flow(ScriptedGitHub(start={"error": "unauthorized_client"}))
