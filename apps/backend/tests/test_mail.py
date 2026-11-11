import base64
import email
import json
import os
import unittest
from unittest import mock

from modules import mail

CREDS = {"refresh_token": "refresh", "client_id": "id", "client_secret": "secret", "token_uri": "https://oauth2.googleapis.com/token"}
EXPERIMENT = {"name": "My experiment", "creatorEmail": "creator@example.com", "passes": 3, "fails": 1}


class TestExperimentEmail(unittest.TestCase):

    def _send(self, experiment, creds=CREDS, post=None):
        post = post or mock.Mock(side_effect=[{"access_token": "access"}, {"id": "message-id"}])
        env = {"GMAIL_CREDS": json.dumps(creds)} if creds is not None else {}
        with mock.patch.dict(os.environ, env, clear=True), mock.patch.object(mail, "_post", post):
            return mail.send_experiment_email(experiment, "COMPLETED"), post

    def test_message_contents(self):
        raw = mail.build_message("creator@example.com", EXPERIMENT, "COMPLETED")["raw"]
        message = email.message_from_bytes(base64.urlsafe_b64decode(raw))

        self.assertEqual(message["to"], "creator@example.com")
        self.assertEqual(message["subject"], "GLADOS Experiment: My experiment")
        body = message.get_payload(decode=True).decode()
        for expected in ("Status: COMPLETED", "Passes: 3", "Fails: 1"):
            self.assertIn(expected, body)

    def test_sends_through_gmail_with_a_fresh_access_token(self):
        sent, post = self._send(EXPERIMENT)

        self.assertTrue(sent)
        token_call, send_call = post.call_args_list
        self.assertEqual(token_call.args[0], CREDS["token_uri"])
        self.assertIn(b"grant_type=refresh_token", token_call.args[1])
        self.assertEqual(send_call.args[0], mail.GMAIL_SEND_URL)
        self.assertEqual(send_call.args[2]["Authorization"], "Bearer access")

    def test_nothing_is_sent_without_credentials_or_recipient(self):
        sent, post = self._send(EXPERIMENT, creds=None)
        self.assertFalse(sent)
        post.assert_not_called()

        sent, post = self._send({"name": "No address"})
        self.assertFalse(sent)
        post.assert_not_called()

    def test_token_endpoint_must_use_https(self):
        sent, post = self._send(EXPERIMENT, creds=dict(CREDS, token_uri="http://attacker.example/token"))

        self.assertFalse(sent)
        post.assert_not_called()

    def test_gmail_errors_do_not_raise(self):
        sent, _post = self._send(EXPERIMENT, post=mock.Mock(side_effect=OSError("network down")))

        self.assertFalse(sent)
