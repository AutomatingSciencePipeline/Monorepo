import os
import stat
import tempfile
import unittest
from pathlib import Path

from glados_mcp.token_store import delete_token, load_token, save_token


class TestTokenStore(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.path = Path(self._tmp.name) / "nested" / "mcp_token"

    def tearDown(self):
        self._tmp.cleanup()

    def test_round_trip(self):
        save_token("abc123\n", self.path)
        self.assertEqual(load_token(self.path), "abc123")

    def test_missing_or_empty_file_means_not_logged_in(self):
        self.assertIsNone(load_token(self.path))
        save_token("   ", self.path)
        self.assertIsNone(load_token(self.path))

    def test_overwrite(self):
        save_token("old", self.path)
        save_token("new", self.path)
        self.assertEqual(load_token(self.path), "new")

    @unittest.skipIf(os.name == "nt", "POSIX permissions only")
    def test_file_is_owner_only(self):
        save_token("abc", self.path)
        self.assertEqual(stat.S_IMODE(self.path.stat().st_mode), 0o600)

    def test_delete(self):
        save_token("abc", self.path)
        self.assertTrue(delete_token(self.path))
        self.assertFalse(delete_token(self.path))
        self.assertIsNone(load_token(self.path))
