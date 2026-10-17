import unittest
from pathlib import Path

from glados_mcp.config import DEFAULT_BASE_URL, ConfigError, get_base_url, get_token_path


class TestBaseUrl(unittest.TestCase):
    def test_default_is_production_https(self):
        self.assertEqual(get_base_url({}), DEFAULT_BASE_URL)

    def test_trailing_slash_is_removed(self):
        self.assertEqual(get_base_url({"GLADOS_BASE_URL": "https://example.edu/"}), "https://example.edu")

    def test_http_allowed_only_for_localhost(self):
        self.assertEqual(get_base_url({"GLADOS_BASE_URL": "http://localhost:3000"}), "http://localhost:3000")
        self.assertEqual(get_base_url({"GLADOS_BASE_URL": "http://127.0.0.1:3000"}), "http://127.0.0.1:3000")

    def test_refuses_insecure_or_odd_urls(self):
        for bad in ("http://glados.csse.rose-hulman.edu", "ftp://example.edu", "https://user:pw@example.edu",
                    "https://example.edu/api", "https://example.edu?x=1", "not a url", "http://localhost.evil.com"):
            with self.subTest(bad=bad), self.assertRaises(ConfigError):
                get_base_url({"GLADOS_BASE_URL": bad})


class TestTokenPath(unittest.TestCase):
    def test_default_is_in_home_not_cwd(self):
        self.assertEqual(get_token_path({}), Path.home() / ".glados" / "mcp_token")

    def test_override(self):
        self.assertEqual(get_token_path({"GLADOS_MCP_TOKEN_FILE": "/tmp/t"}), Path("/tmp/t"))
