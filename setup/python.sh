#!/bin/bash

if command -v pyenv > /dev/null; then
    echo "✔ pyenv is already installed"
else
    echo "▶ pyenv is not installed. Installing..."
    if [ "$IS_WINDOWS" ]; then
        echo "ℹ If the next command fails due to permissions problems, you probably need to run \`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned\` to change powershell permissions"
        echo "ℹ https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-7.3"
        powershell ./setup/windows-pyenv-install.ps1
        echo "⚠ pyenv install ran. You need to restart the terminal session you're in so that pyenv is recognized as installed. You may need to restart your computer"
        # Powershell can run this to reload:
        # $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        exit 1
    fi

    if [ "$IS_UNIX" ]; then
        curl https://pyenv.run | bash
    fi

    if command -v pyenv; then
        echo "✔ pyenv install successful"
    else
        echo "🛑 pyenv install seems to have failed"
        exit 1
    fi
fi

if pyenv versions | grep "${PYTHON_VERSION}" -q; then
    echo "✔ Python version ${PYTHON_VERSION} is already installed via pyenv"
else
    echo "▶ Installing python ${PYTHON_VERSION} via pyenv..."
    pyenv install "${PYTHON_VERSION}"
fi

if pyenv vname | grep "${PYTHON_VERSION}" -q; then
    echo "✔ Currently selected python version is already ${PYTHON_VERSION}"
else
    echo "▶ Switching system selected python version via pyenv to ${PYTHON_VERSION}"
    pyenv global "${PYTHON_VERSION}"
fi

if python --version | grep "${PYTHON_VERSION}"; then
    echo "✔ Python version selection successful"
else
    echo "⚠ Another python install with the version below seems to be taking precedence?"
    python --version
    which python
    echo "⚠ Switching system selected python version via pyenv to ${PYTHON_VERSION}"
    pyenv global "${PYTHON_VERSION}"
    if python --version | grep "${PYTHON_VERSION}"; then
        echo "✔ Python version selection successful"
    else
        echo "🛑 Failed to change over python version. You probably have to uninstall that other version of python to proceed so pyenv can work."
        echo "It is suggested you do so with Windows' 'Add or Remove Programs' tool"
        echo "More info here: https://stackoverflow.com/questions/3515673/how-to-completely-remove-python-from-a-windows-machine"
        echo "After this, the script will install python (the version required for this project) again for you."
        echo "You can use pyenv to install your old Python version again too if you wish: https://realpython.com/intro-to-pyenv/"
        exit 1
    fi
fi

# Setup venv
echo "▶ Setting up venv..."

if test -e "${BACKEND_VENV_PATH}"; then
    echo "✔ .venv already exists (${BACKEND_VENV_PATH})"
else
    echo "▶ Creating .venv at ${BACKEND_VENV_PATH}"
    python -m venv "${BACKEND_VENV_PATH}"
fi

# Activate venv

# We don't need the linter to analyze the venv activation script
# shellcheck disable=SC1091
source "${BACKEND_VENV_PATH}/Scripts/activate"

# check if VIRTUAL_ENV var is empty -> we're not in one
# https://stackoverflow.com/questions/15454174/how-can-a-shell-function-know-if-it-is-running-within-a-virtualenv
if test -z "${VIRTUAL_ENV}"; then
    echo "🛑 Failed to activate venv, so not proceeding to try and install any python packages."
    exit 1
else
    echo "✔ Successfully activated venv ${VIRTUAL_ENV}"
fi

# Install python dependencies
echo "▶ Installing and updating project python dependencies"
if ! pip install -U pip; then
    echo "🛑 Failed to update pip? See above error. Try just running the script again if it's a permissions issue"
    exit 1
fi
if ! pip install -r ./apps/backend/requirements.txt; then
    echo "🛑 Failed to install or update backend dependencies, check above error for more details"
    exit 1
fi

if [ "$IS_WINDOWS" ]; then
    echo "▶ Installing windows-specific python dependencies"
    if ! pip install -r ./apps/backend/requirements-windows.txt; then
        echo "🛑 Failed to install or update backend dependencies, check above error for more details"
        exit 1
    fi
fi

# Copy in the .env file
echo "▶ Copying/updating .env file from repo root to the Backend directory"
if ! test -e ".env"; then
    echo "🛑 You don't seem to have a .env file in the repo root - follow the directions here to get one: https://github.com/AutomatingSciencePipeline/Monorepo/wiki/User-Guide#get-the-env-files"
    exit 1
fi
if ! cp -f .env ./apps/backend/.env; then
    echo "🛑 Failed to copy .env file from repo root to backend?"
    exit 1
fi
