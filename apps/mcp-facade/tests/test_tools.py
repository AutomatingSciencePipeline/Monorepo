import json
import unittest

from glados_mcp import errors, tools
from glados_mcp.rest import GladosClient, TransportError
from tests.test_rest import TOKEN, FakeTransport, make_client

EXP_ID = "0123456789abcdef01234567"


class TestGetExperimentStatus(unittest.TestCase):
    def test_success_returns_only_allowlisted_fields(self):
        transport = FakeTransport((200, {"success": True, "status": "COMPLETED", "current_permutation": 3,
                                         "total_permutations": 9, "results": "a,b,c", "extra": {"x": 1}}))
        result = tools.get_experiment_status(make_client(transport), EXP_ID)
        self.assertEqual(result, {"ok": True, "status": "COMPLETED", "current_permutation": 3, "total_permutations": 9})

    def test_missing_fields_are_not_invented(self):
        transport = FakeTransport((200, {"success": True, "status": "RUNNING"}))
        self.assertEqual(tools.get_experiment_status(make_client(transport), EXP_ID), {"ok": True, "status": "RUNNING"})

    def test_non_scalar_values_dropped(self):
        transport = FakeTransport((200, {"success": True, "status": {"nested": "smuggled"}}))
        self.assertEqual(tools.get_experiment_status(make_client(transport), EXP_ID), {"ok": True})

    def test_bad_ids_refused_without_request(self):
        for bad in ("", "123", EXP_ID.upper(), EXP_ID + "0", "../../etc/passwd", None, 42, ["x"]):
            with self.subTest(bad=bad):
                transport = FakeTransport()
                self.assertEqual(tools.get_experiment_status(make_client(transport), bad),
                                 {"ok": False, "error": errors.INVALID_ARGUMENT})
                self.assertEqual(transport.calls, [])

    def test_upstream_error_mapping(self):
        for upstream, code in (("not_found", errors.NOT_FOUND), ("auth_error", errors.AUTH_FAILED),
                               ("Other", errors.UPSTREAM_ERROR), (None, errors.UPSTREAM_ERROR),
                               ("some new message", errors.UPSTREAM_ERROR)):
            with self.subTest(upstream=upstream):
                transport = FakeTransport((200, {"success": False, "error": upstream}))
                self.assertEqual(tools.get_experiment_status(make_client(transport), EXP_ID),
                                 {"ok": False, "error": code})

    def test_not_logged_in(self):
        self.assertEqual(tools.get_experiment_status(make_client(FakeTransport(), token=None), EXP_ID),
                         {"ok": False, "error": errors.NOT_LOGGED_IN})


class TestListExperiments(unittest.TestCase):
    def test_success_filters_each_match(self):
        match = {"id": EXP_ID, "name": "sweep", "tags": ["t"], "status": "COMPLETED", "started_on": 5,
                 "current_permutation": 1, "total_permutations": 2, "creator": "uid-1"}
        transport = FakeTransport((200, {"success": True, "matches": [match, "junk", None]}))
        result = tools.list_experiments(make_client(transport), "*")
        self.assertEqual(result, {"ok": True, "experiments": [
            {"id": EXP_ID, "name": "sweep", "status": "COMPLETED", "started_on": 5,
             "current_permutation": 1, "total_permutations": 2}]})
        self.assertEqual(transport.calls[0][1]["exp_title"], "*")

    def test_title_passed_through_unchanged(self):
        transport = FakeTransport((200, {"success": True, "matches": []}))
        tools.list_experiments(make_client(transport), "  My Exp ")
        self.assertEqual(transport.calls[0][1]["exp_title"], "  My Exp ")

    def test_bad_titles_refused_without_request(self):
        for bad in ("", "   ", "x" * 201, None, 7):
            with self.subTest(bad=bad):
                transport = FakeTransport()
                self.assertEqual(tools.list_experiments(make_client(transport), bad),
                                 {"ok": False, "error": errors.INVALID_ARGUMENT})
                self.assertEqual(transport.calls, [])

    def test_malformed_matches(self):
        transport = FakeTransport((200, {"success": True, "matches": "nope"}))
        self.assertEqual(tools.list_experiments(make_client(transport), "*"),
                         {"ok": False, "error": errors.UPSTREAM_ERROR})


class TestTokenNeverLeaks(unittest.TestCase):
    """S-3: across every response shape, no tool output contains the token."""

    OUTCOMES = [
        (200, {"success": True, "status": TOKEN, "matches": [{"name": "n"}]}),
        (200, {"success": False, "error": TOKEN}),
        (400, TOKEN.encode()), (401, TOKEN.encode()), (404, {"response": "Missing User", "token": TOKEN}),
        (500, ("Traceback ... " + TOKEN).encode()), (302, b""), (200, b"not json " + TOKEN.encode()),
        TransportError(),
    ]

    def test_all_outcomes(self):
        for outcome in self.OUTCOMES:
            for call in (lambda c: tools.get_experiment_status(c, EXP_ID), lambda c: tools.list_experiments(c, "*")):
                retries = [outcome] * 3 if isinstance(outcome, Exception) else [outcome]
                client = GladosClient("https://g.example", lambda: TOKEN, transport=FakeTransport(*retries))
                self.assertNotIn(TOKEN, json.dumps(call(client)), msg=str(outcome))

    def test_echoed_token_fails_closed(self):
        transport = FakeTransport((200, {"success": True, "status": TOKEN}))
        self.assertEqual(tools.get_experiment_status(make_client(transport), EXP_ID),
                         {"ok": False, "error": errors.UPSTREAM_ERROR})


class TestErrorCodes(unittest.TestCase):
    def test_error_result_only_emits_known_codes(self):
        self.assertEqual(errors.error_result("whatever"), {"ok": False, "error": errors.UPSTREAM_ERROR})
        self.assertEqual(errors.FacadeError("raw message").code, errors.UPSTREAM_ERROR)
