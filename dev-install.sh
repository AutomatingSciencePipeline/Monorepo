#!/bin/bash
# You need Bash installed to run this script. Follow the setup directions here: https://github.com/AutomatingSciencePipeline/Monorepo/wiki

DOCKER_URL="https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
DOCKER_INSTALLER_LOCATION="./setup/temp/DockerDesktopInstaller.exe"

# Should match python version used by the container
PYTHON_VERSION="3.8.10"
BACKEND_VENV_PATH="./apps/backend/.venv"

# TODO only install docker desktop on windows
# `command -v` returns 0 if command success or 1 if failure
if command -v docker; then
    echo "Docker is already installed"
else
    echo "Docker is not installed"
    if test -e ${DOCKER_INSTALLER_LOCATION}; then
        echo "Docker Desktop Installer already exists at ${DOCKER_INSTALLER_LOCATION}"
    else
        echo "Downloading Docker Desktop Installer from ${DOCKER_URL}"
        echo "and placing it at ${DOCKER_INSTALLER_LOCATION}"
        curl ${DOCKER_URL} > ${DOCKER_INSTALLER_LOCATION}
    fi

    echo "Installing Docker. This may open an admin prompt you have to accept. Afterwards, you'll have to restart Windows as its GUI will prompt. Then you'll have to re-run this script."
    # https://docs.docker.com/desktop/install/windows-install/#install-from-the-command-line
    ${DOCKER_INSTALLER_LOCATION} install --accept-license --backend=wsl-2
fi

if command -v pyenv; then
    echo "pyenv is already installed"
else
    echo "pyenv is not installed. Installing..."
    # TODO IF LINUX
    # curl https://pyenv.run | bash
    # IF WINDOWS
    # TODO change execution policy via `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned`
    powershell ./setup/windows-pyenv-install.ps1
    echo "Install complete (probably?). Need to restart the bash window so that pipenv is recognized as installed"
    # Powershell can run this to reload:
    # $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    exit 0
fi

# TODO check if installed
echo "Installing python ${PYTHON_VERSION} via pyenv..."
pyenv install ${PYTHON_VERSION}
pyenv global ${PYTHON_VERSION}

if command -v python --version; then
    echo "Python install successful"
else
    echo "Python install does not appear to have succeeded, can't continue"
    exit 1
fi

# Setup venv
echo "Setting up venv..."

if test -e "${BACKEND_VENV_PATH}"; then
    echo ".venv already exists (${BACKEND_VENV_PATH})"
else
    echo "Creating .venv at ${BACKEND_VENV_PATH}"
    python -m venv ${BACKEND_VENV_PATH}
fi

# Activate venv
source "${BACKEND_VENV_PATH}/Scripts/activate"

# check if VIRTUAL_ENV var is empty -> we're not in one
# https://stackoverflow.com/questions/15454174/how-can-a-shell-function-know-if-it-is-running-within-a-virtualenv
if test -z ${VIRTUAL_ENV}; then
    echo "Failed to activate venv, so not proceeding to try and install any python packages."
    exit 1
else
    echo "Successfully activated venv ${VIRTUAL_ENV}"
fi

# Install python dependencies
pip install -U pip
pip install -r ./apps/backend/requirements.txt

# TODO node setup

echo "Environment setup completed (probably)"
echo "Environment now set up. Before you begin working in Python in each new terminal shell, run `source .venv/bin/activate` from the repo root to enter the Virtual Env. You should see `(venv)` on your console line when you are in a virtual env. To exit the venv, just close the shell or send the command `deactivate`."