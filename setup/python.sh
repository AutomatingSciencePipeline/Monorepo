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

if python --version | grep "${PYTHON_VERSION}" -q; then
    echo "✔ Python version selection successful"
else
    echo "🛑 Python install does not appear to have succeeded, can't continue!"
    exit 1
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
    echo "🛑 Failed to update pip? See above error"
    exit 1
fi
if ! pip install -r ./apps/backend/requirements.txt; then
    echo "🛑 Failed to install or update backend dependencies, check above error for more details"
    exit 1
fi
