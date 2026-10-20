"""Facade configuration. Read once at startup from the environment, never from the agent."""
import os
from pathlib import Path
from urllib.parse import urlsplit

DEFAULT_BASE_URL = "https://glados.csse.rose-hulman.edu"
LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


class ConfigError(ValueError):
    pass


def get_base_url(env=None) -> str:
    """Return the GLADOS base URL. Only https is allowed, except plain http to localhost for dev (S-6)."""
    env = os.environ if env is None else env
    raw = env.get("GLADOS_BASE_URL", DEFAULT_BASE_URL).strip().rstrip("/")
    parts = urlsplit(raw)
    if parts.username or parts.password or parts.query or parts.fragment or parts.path or not parts.hostname:
        raise ConfigError("GLADOS_BASE_URL must be a bare origin like https://host[:port]")
    if parts.scheme == "https":
        return f"https://{parts.netloc}"
    if parts.scheme == "http" and parts.hostname in LOOPBACK_HOSTS:
        return f"http://{parts.netloc}"
    raise ConfigError("GLADOS_BASE_URL must use https (plain http is only allowed for localhost)")


def get_token_path(env=None) -> Path:
    env = os.environ if env is None else env
    override = env.get("GLADOS_MCP_TOKEN_FILE")
    if override:
        return Path(override)
    return Path.home() / ".glados" / "mcp_token"
