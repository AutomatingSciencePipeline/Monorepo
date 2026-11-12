"""Extraction of user-supplied archives.

Experiment archives come from users, so they are treated as untrusted: entries may not point outside
the destination folder, and the archive may not expand into an unreasonable number of files or bytes.
"""
import os
import zipfile

from modules.exceptions import GladosUserError

DEFAULT_MAX_MEMBERS = 100000
DEFAULT_MAX_TOTAL_BYTES = 8 * 1024 ** 3


def _limit_from_env(name: str, default: int) -> int:
    value = os.environ.get(name)
    if not value:
        return default
    return int(value)


def _is_unsafe_member_name(name: str) -> bool:
    normalized = name.replace("\\", "/")
    if normalized.startswith("/"):
        return True
    # A drive letter such as C: would make the path absolute on Windows
    if len(normalized) > 1 and normalized[1] == ":":
        return True
    return ".." in normalized.split("/")


def safe_extract_zip(zip_path: str, destination: str, max_members: "int | None" = None, max_total_bytes: "int | None" = None):
    """Extract a zip file after checking that doing so is safe.

    Limits can be tuned with RUNNER_MAX_ARCHIVE_MEMBERS and RUNNER_MAX_ARCHIVE_BYTES.
    Symbolic links stored in the archive are written out as plain files, never as links.

    Raises:
        GladosUserError: the archive is malformed, escapes the destination, or is too large
    """
    if max_members is None:
        max_members = _limit_from_env("RUNNER_MAX_ARCHIVE_MEMBERS", DEFAULT_MAX_MEMBERS)
    if max_total_bytes is None:
        max_total_bytes = _limit_from_env("RUNNER_MAX_ARCHIVE_BYTES", DEFAULT_MAX_TOTAL_BYTES)

    destination_root = os.path.realpath(destination)
    try:
        with zipfile.ZipFile(zip_path) as archive:
            members = archive.infolist()
            if len(members) > max_members:
                raise GladosUserError(f"Archive has {len(members)} entries, the limit is {max_members}")

            total_bytes = 0
            for member in members:
                if _is_unsafe_member_name(member.filename):
                    raise GladosUserError(f"Archive entry '{member.filename}' points outside the experiment folder")
                target = os.path.realpath(os.path.join(destination_root, member.filename))
                if target != destination_root and not target.startswith(destination_root + os.sep):
                    raise GladosUserError(f"Archive entry '{member.filename}' points outside the experiment folder")
                # Extraction never writes more than the declared size of an entry, so this bounds disk usage
                total_bytes += member.file_size
                if total_bytes > max_total_bytes:
                    raise GladosUserError(f"Archive expands to more than {max_total_bytes} bytes")

            for member in members:
                archive.extract(member, destination_root)
    except zipfile.BadZipFile as err:
        raise GladosUserError("The uploaded archive is not a valid zip file") from err
