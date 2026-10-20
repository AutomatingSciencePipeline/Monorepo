import asyncio
import unittest

from glados_mcp import server as server_module
from glados_mcp.server import TOOL_NAMES, build_server
from tests.test_rest import FakeTransport, make_client


class TestServer(unittest.TestCase):
    def test_tool_registry_is_exactly_the_allowlist(self):
        tools = asyncio.run(build_server(make_client(FakeTransport())).list_tools())
        self.assertEqual(sorted(tool.name for tool in tools), sorted(TOOL_NAMES))

    def test_tools_take_only_simple_string_arguments(self):
        # S-4: no free-form paths, URLs or endpoint specifiers beyond the declared string argument
        tools = asyncio.run(build_server(make_client(FakeTransport())).list_tools())
        for tool in tools:
            properties = tool.input_schema["properties"]
            self.assertEqual(len(properties), 1, tool.name)
            self.assertEqual(next(iter(properties.values()))["type"], "string", tool.name)

    def test_unexpected_exception_becomes_fixed_error(self):
        def explode(_client, _arg):
            raise RuntimeError("secret internal detail")
        self.assertEqual(server_module._guarded(explode, None, "x"),  # pylint: disable=protected-access
                         {"ok": False, "error": "UPSTREAM_ERROR"})
