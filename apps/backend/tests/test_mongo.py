import unittest
from datetime import datetime, timedelta, timezone
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from bson.errors import InvalidId
from bson.objectid import ObjectId
from gridfs import GridFSBucket

from modules import mongo


class DownloadExperimentFileTests(unittest.TestCase):
    def setUp(self):
        self.owned_id = ObjectId("507f1f77bcf86cd799439015")
        self.foreign_id = ObjectId("507f1f77bcf86cd799439016")
        uploaded_at = datetime(2026, 11, 9, tzinfo=timezone.utc)
        self.files = [
            SimpleNamespace(
                _id=self.owned_id,
                filename="experiment.zip",
                uploadDate=uploaded_at,
                metadata={"userId": "owner"},
            ),
            SimpleNamespace(
                _id=self.foreign_id,
                filename="experiment.zip",
                uploadDate=uploaded_at + timedelta(seconds=1),
                metadata={"userId": "other-owner"},
            ),
        ]
        self.contents = {
            self.owned_id: b"owned experiment archive",
            self.foreign_id: b"foreign experiment archive",
        }
        self.bucket = MagicMock(spec=GridFSBucket)
        self.bucket.find.side_effect = lambda query: SimpleNamespace(
            to_list=lambda: [file for file in self.files if file._id == query["_id"]]
        )
        self.bucket.open_download_stream.side_effect = (
            lambda file_id: BytesIO(self.contents[file_id])
        )
        self.bucket.open_download_stream_by_name.side_effect = self.download_by_name
        self.client = MagicMock()
        self.bucket_patch = patch.object(mongo, "GridFSBucket", return_value=self.bucket)
        self.bucket_factory = self.bucket_patch.start()
        self.addCleanup(self.bucket_patch.stop)

    def download_by_name(self, filename):
        file = max(
            (file for file in self.files if file.filename == filename),
            key=lambda file: file.uploadDate,
        )
        return BytesIO(self.contents[file._id])

    def test_downloads_requested_id_despite_newer_foreign_file_with_same_name(self):
        contents = mongo.download_experiment_file(str(self.owned_id), self.client)

        self.assertEqual(contents, self.contents[self.owned_id])
        self.bucket_factory.assert_called_once_with(
            self.client["gladosdb"], bucket_name="fileBucket"
        )
        self.bucket.find.assert_called_once_with({"_id": self.owned_id})
        self.bucket.open_download_stream.assert_called_once_with(self.owned_id)
        self.bucket.open_download_stream_by_name.assert_not_called()

    def test_uppercase_id_downloads_requested_file(self):
        contents = mongo.download_experiment_file(str(self.owned_id).upper(), self.client)

        self.assertEqual(contents, self.contents[self.owned_id])
        self.bucket.open_download_stream.assert_called_once_with(self.owned_id)
        self.bucket.open_download_stream_by_name.assert_not_called()

    def test_missing_id_raises_without_downloading_another_file(self):
        missing_id = ObjectId("507f1f77bcf86cd799439017")

        with self.assertRaisesRegex(Exception, "^No file found!$"):
            mongo.download_experiment_file(str(missing_id), self.client)

        self.bucket.find.assert_called_once_with({"_id": missing_id})
        self.bucket.open_download_stream.assert_not_called()
        self.bucket.open_download_stream_by_name.assert_not_called()

    def test_invalid_id_raises_without_looking_up_or_downloading_a_file(self):
        with self.assertRaises(InvalidId):
            mongo.download_experiment_file("not-an-object-id", self.client)

        self.bucket.find.assert_not_called()
        self.bucket.open_download_stream.assert_not_called()
        self.bucket.open_download_stream_by_name.assert_not_called()


if __name__ == "__main__":
    unittest.main()
