"""A tiny stand-in for the GLADOS /api/cli routes, for local end-to-end tests."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VALID_TOKEN = "fake-valid-token"
KNOWN_EXP_ID = "0123456789abcdef01234567"

EXPERIMENT = {
    "id": KNOWN_EXP_ID,
    "name": "addNums sweep",
    "tags": ["private-tag"],
    "status": "COMPLETED",
    "started_on": 1760000000000,
    "current_permutation": 100,
    "total_permutations": 100,
    "secret_field": "should never reach the agent",
}


class _Handler(BaseHTTPRequestHandler):
    def do_POST(self):  # pylint: disable=invalid-name
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "https://example.com/")
            self.send_header("Content-Length", "0")
            self.end_headers()
        elif body.get("token") != VALID_TOKEN:
            self._send(401, {"error": "unauthorized"})
        elif self.path == "/api/cli/status":
            if body.get("eid") == KNOWN_EXP_ID:
                self._send(200, {"success": True, "status": "COMPLETED", "current_permutation": 100,
                                 "total_permutations": 100, "secret_field": "leak"})
            else:
                self._send(200, {"success": False, "error": "not_found"})
        elif self.path == "/api/cli/queryExp":
            matches = [EXPERIMENT] if body.get("exp_title") in ("*", EXPERIMENT["name"]) else []
            self._send(200, {"success": True, "matches": matches})
        else:
            self._send(404, {"error": "no route"})

    def _send(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):  # pylint: disable=redefined-builtin
        pass


def start():
    """Start the server on a free localhost port. Returns (server, base_url)."""
    server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"
