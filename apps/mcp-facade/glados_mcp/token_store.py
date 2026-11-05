"""Stores the GitHub token outside the working directory, readable only by the current user."""
import os
from pathlib import Path


def save_token(token: str, path: Path) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as token_file:
        token_file.write(token.strip())
    # os.open only applies the mode when it creates the file
    os.chmod(path, 0o600)


def load_token(path: Path):
    try:
        token = path.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return token or None


def delete_token(path: Path) -> bool:
    try:
        path.unlink()
    except FileNotFoundError:
        return False
    return True
