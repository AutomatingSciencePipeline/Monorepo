import os

from dotenv import load_dotenv

# Must override so that vscode doesn't incorrectly parse another env file and have bad values
HAS_DOTENV_FILE = load_dotenv("./.env", override=True)

def _get_env(key: str):
    value = os.environ.get(key)
    if value is None:
        if HAS_DOTENV_FILE:
            raise AssertionError(f"Missing environment variable {key} in your `.env` file")
        raise AssertionError(f"Missing environment variable {key} - you need a `.env` file in this folder with it defined")
    return value
