"""Command line entry point: `python -m glados_mcp {serve,login,logout}`."""
import argparse
import sys

from . import config, token_store
from .login import LoginError, device_flow


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m glados_mcp", description="Local MCP facade for GLADOS")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("serve", help="run the MCP server over stdio (started by your MCP client)")
    sub.add_parser("login", help="sign in with GitHub and store the token locally")
    sub.add_parser("logout", help="delete the stored token")
    args = parser.parse_args(argv)

    try:
        token_path = config.get_token_path()
        if args.command == "serve":
            # Imported here so login/logout work without loading the MCP SDK
            from .server import serve  # pylint: disable=import-outside-toplevel
            serve()
        elif args.command == "login":
            token_store.save_token(device_flow(), token_path)
            print(f"Logged in. Token stored in {token_path}", file=sys.stderr)
        else:
            removed = token_store.delete_token(token_path)
            print("Logged out." if removed else "No stored token.", file=sys.stderr)
    except (LoginError, config.ConfigError) as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
