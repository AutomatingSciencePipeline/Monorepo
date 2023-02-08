#!/bin/bash

export DOCKER_URL="https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
export DOCKER_INSTALLER_LOCATION="./setup/temp/DockerDesktopInstaller.exe"

# Should match python version used by the container
export PYTHON_VERSION="3.8.10"
export BACKEND_VENV_PATH="./apps/backend/.venv"

export NVM_WINDOWS_URL="https://github.com/coreybutler/nvm-windows/releases/download/1.1.10/nvm-setup.exe"
export NVM_WINDOWS_INSTALLER_LOCATION="./setup/temp/nvm-setup.exe"
# Should match node version used by the container
export NODE_VERSION="14.15.1"
