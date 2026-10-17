import json
import unittest

from glados_mcp import errors
from glados_mcp.errors import FacadeError
from glados_mcp.rest import QUERY_ROUTE, STATUS_ROUTE, GladosClient, TransportError, urllib_transport
from tests import fake_glados

TOKEN = "SENTINEL-TOKEN-7f3a"


class FakeTransport:
    """Records calls and replays scripted outcomes: (status, body) tuples or exceptions."""

    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.calls = []

    def __call__(self, url, payload, timeout):
        self.calls.append((url, dict(payload), timeout))
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        status, body = outcome
        return status, body if isinstance(body, bytes) else json.dumps(body).encode()


def make_client(transport, token=TOKEN):
    return GladosClient("https://glados.example", lambda: token, transport=transport, max_retries=2)


class TestGladosClient(unittest.TestCase):
    def test_attaches_token_and_fields(self):
        transport = FakeTransport((200, {"success": True}))
        self.assertEqual(make_client(transport).post(STATUS_ROUTE, {"eid": "x"}), {"success": True})
        url, payload, _ = transport.calls[0]
        self.assertEqual(url, "https://glados.example/api/cli/status")
        self.assertEqual(payload, {"eid": "x", "token": TOKEN})

    def test_agent_fields_cannot_override_token(self):
        transport = FakeTransport((200, {}))
        make_client(transport).post(QUERY_ROUTE, {"exp_title": "*", "token": "attacker"})
        self.assertEqual(transport.calls[0][1]["token"], TOKEN)

    def test_no_token_makes_no_request(self):
        transport = FakeTransport()
        with self.assertRaises(FacadeError) as ctx:
            make_client(transport, token=None).post(STATUS_ROUTE, {})
        self.assertEqual(ctx.exception.code, errors.NOT_LOGGED_IN)
        self.assertEqual(transport.calls, [])

    def test_unknown_route_refused(self):
        transport = FakeTransport()
        with self.assertRaises(FacadeError):
            make_client(transport).post("/api/cli/downloadResult", {})
        self.assertEqual(transport.calls, [])

    def test_transport_errors_retried_then_unavailable(self):
        transport = FakeTransport(TransportError(), TransportError(), TransportError())
        with self.assertRaises(FacadeError) as ctx:
            make_client(transport).post(STATUS_ROUTE, {})
        self.assertEqual(ctx.exception.code, errors.UNAVAILABLE)
        self.assertEqual(len(transport.calls), 3)

    def test_transport_error_then_success(self):
        transport = FakeTransport(TransportError(), (200, {"ok": 1}))
        self.assertEqual(make_client(transport).post(STATUS_ROUTE, {}), {"ok": 1})
        self.assertEqual(len(transport.calls), 2)

    def test_http_errors_are_not_retried(self):
        for status, code in ((401, errors.AUTH_FAILED), (403, errors.AUTH_FAILED), (400, errors.INVALID_ARGUMENT),
                             (404, errors.UPSTREAM_ERROR), (500, errors.UPSTREAM_ERROR),
                             (302, errors.UPSTREAM_ERROR)):
            with self.subTest(status=status):
                transport = FakeTransport((status, {"response": "Missing User"}))
                with self.assertRaises(FacadeError) as ctx:
                    make_client(transport).post(STATUS_ROUTE, {})
                self.assertEqual(ctx.exception.code, code)
                self.assertEqual(len(transport.calls), 1)

    def test_bad_bodies(self):
        for body in (b"<html>oops</html>", b"[1, 2]", b"\xff\xfe"):
            with self.subTest(body=body), self.assertRaises(FacadeError) as ctx:
                make_client(FakeTransport((200, body))).post(STATUS_ROUTE, {})
            self.assertEqual(ctx.exception.code, errors.UPSTREAM_ERROR)

    def test_errors_never_carry_the_token(self):
        transport = FakeTransport((500, ("boom " + TOKEN).encode()))
        with self.assertRaises(FacadeError) as ctx:
            make_client(transport).post(STATUS_ROUTE, {})
        self.assertNotIn(TOKEN, str(ctx.exception))
        self.assertNotIn(TOKEN, repr(ctx.exception))


class TestUrllibTransport(unittest.TestCase):
    """Exercises the real HTTP transport against the local fake server."""

    def setUp(self):
        self.server, self.base_url = fake_glados.start()

    def tearDown(self):
        self.server.shutdown()

    def test_real_round_trip(self):
        status, body = urllib_transport(self.base_url + STATUS_ROUTE,
                                        {"token": fake_glados.VALID_TOKEN, "eid": fake_glados.KNOWN_EXP_ID}, 5)
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)["success"])

    def test_http_error_status_is_returned_not_raised(self):
        status, _ = urllib_transport(self.base_url + STATUS_ROUTE, {"token": "bad"}, 5)
        self.assertEqual(status, 401)

    def test_redirects_are_not_followed(self):
        status, _ = urllib_transport(self.base_url + "/redirect", {}, 5)
        self.assertEqual(status, 302)

    def test_connection_refused_is_transport_error(self):
        port = self.server.server_address[1]
        self.server.shutdown()
        self.server.server_close()
        with self.assertRaises(TransportError):
            urllib_transport(f"http://127.0.0.1:{port}/api/cli/status", {}, 2)
