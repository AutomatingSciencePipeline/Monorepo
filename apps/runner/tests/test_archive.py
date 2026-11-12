import os
import tempfile
import unittest
import zipfile

from modules.archive import safe_extract_zip
from modules.exceptions import GladosUserError


class TestSafeExtractZip(unittest.TestCase):

    def setUp(self):
        self.tempDir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempDir.cleanup)
        self.zipPath = os.path.join(self.tempDir.name, "upload.zip")
        self.destination = os.path.join(self.tempDir.name, "experiment")
        os.mkdir(self.destination)

    def _write_zip(self, entries: "dict[str, bytes]"):
        with zipfile.ZipFile(self.zipPath, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, contents in entries.items():
                archive.writestr(name, contents)

    def _extracted_files(self):
        found = []
        for root, _dirs, files in os.walk(self.tempDir.name):
            for file in files:
                found.append(os.path.relpath(os.path.join(root, file), self.tempDir.name))
        return sorted(found)

    def test_extracts_a_normal_archive(self):
        self._write_zip({"main.py": b"print('hi')", "pkg/helper.py": b"x = 1"})

        safe_extract_zip(self.zipPath, self.destination)

        with open(os.path.join(self.destination, "pkg", "helper.py"), "rb") as file:
            self.assertEqual(file.read(), b"x = 1")
        self.assertTrue(os.path.isfile(os.path.join(self.destination, "main.py")))

    def test_rejects_parent_directory_entries(self):
        self._write_zip({"ok.py": b"", "../escaped.py": b"owned"})

        with self.assertRaises(GladosUserError):
            safe_extract_zip(self.zipPath, self.destination)

        # Nothing is written at all, not even the harmless entry before the bad one
        self.assertEqual(self._extracted_files(), ["upload.zip"])

    def test_rejects_absolute_entries(self):
        self._write_zip({"/tmp/glados_absolute_entry.py": b"owned"})

        with self.assertRaises(GladosUserError):
            safe_extract_zip(self.zipPath, self.destination)

    def test_rejects_too_many_entries(self):
        self._write_zip({f"file{n}.txt": b"" for n in range(5)})

        with self.assertRaises(GladosUserError):
            safe_extract_zip(self.zipPath, self.destination, max_members=4)

    def test_rejects_archives_that_expand_too_much(self):
        # Highly compressible, so the zip itself stays tiny
        self._write_zip({"zeros.bin": b"\0" * 1_000_000})
        self.assertLess(os.path.getsize(self.zipPath), 10_000)

        with self.assertRaises(GladosUserError):
            safe_extract_zip(self.zipPath, self.destination, max_total_bytes=999_999)
        self.assertEqual(self._extracted_files(), ["upload.zip"])

    def test_limits_can_come_from_the_environment(self):
        self._write_zip({"a.txt": b"", "b.txt": b""})
        os.environ["RUNNER_MAX_ARCHIVE_MEMBERS"] = "1"
        self.addCleanup(os.environ.pop, "RUNNER_MAX_ARCHIVE_MEMBERS")

        with self.assertRaises(GladosUserError):
            safe_extract_zip(self.zipPath, self.destination)

    def test_rejects_files_that_are_not_zips(self):
        with open(self.zipPath, "wb") as file:
            file.write(b"this is not a zip")

        with self.assertRaises(GladosUserError):
            safe_extract_zip(self.zipPath, self.destination)
