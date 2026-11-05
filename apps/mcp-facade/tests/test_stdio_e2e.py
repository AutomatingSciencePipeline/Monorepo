"""End to end: a real MCP client launches the facade over stdio, which calls a fake GLADOS server."""
import asyncio
import os
import sys
import tempfile
import unittest
from pathlib import Path

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, get_default_environment, stdio_client

from glados_mcp.token_store import save_token
from tests import fake_glados

FACADE_DIR = Path(__file__).resolve().parent.parent


async def _run_session(base_url: str, token_file: Path, calls):
    env = get_default_environment()
    env.update({"GLADOS_BASE_URL": base_url, "GLADOS_MCP_TOKEN_FILE": str(token_file)})
    params = StdioServerParameters(command=sys.executable, args=["-m", "glados_mcp", "serve"], env=env,
                                   cwd=str(FACADE_DIR))
    with open(os.devnull, "w", encoding="utf-8") as errlog:
        async with stdio_client(params, errlog=errlog) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                listed = await session.list_tools()
                results = [await session.call_tool(name, args) for name, args in calls]
    return sorted(tool.name for tool in listed.tools), [r.structured_content for r in results]


class TestStdioEndToEnd(unittest.TestCase):
    def setUp(self):
        self.server, self.base_url = fake_glados.start()
        self._tmp = tempfile.TemporaryDirectory()
        self.token_file = Path(self._tmp.name) / "mcp_token"

    def tearDown(self):
        self.server.shutdown()
        self._tmp.cleanup()

    def _run(self, calls):
        return asyncio.run(asyncio.wait_for(_run_session(self.base_url, self.token_file, calls), timeout=60))

    def test_full_round_trip(self):
        save_token(fake_glados.VALID_TOKEN, self.token_file)
        names, results = self._run([
            ("list_experiments", {"title": "*"}),
            ("get_experiment_status", {"exp_id": fake_glados.KNOWN_EXP_ID}),
            ("get_experiment_status", {"exp_id": "f" * 24}),
            ("get_experiment_status", {"exp_id": "not-an-id"}),
        ])
        self.assertEqual(names, ["get_experiment_status", "list_experiments"])
        listed, status, missing, invalid = results
        self.assertEqual(listed, {"ok": True, "experiments": [{
            "id": fake_glados.KNOWN_EXP_ID, "name": "addNums sweep", "status": "COMPLETED",
            "started_on": 1760000000000, "current_permutation": 100, "total_permutations": 100}]})
        self.assertEqual(status, {"ok": True, "status": "COMPLETED", "current_permutation": 100,
                                  "total_permutations": 100})
        self.assertEqual(missing, {"ok": False, "error": "NOT_FOUND"})
        self.assertEqual(invalid, {"ok": False, "error": "INVALID_ARGUMENT"})

    def test_wrong_token_and_no_token(self):
        save_token("wrong-token", self.token_file)
        _, (wrong,) = self._run([("list_experiments", {"title": "*"})])
        self.assertEqual(wrong, {"ok": False, "error": "AUTH_FAILED"})

        self.token_file.unlink()
        _, (missing,) = self._run([("list_experiments", {"title": "*"})])
        self.assertEqual(missing, {"ok": False, "error": "NOT_LOGGED_IN"})
