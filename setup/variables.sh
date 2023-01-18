#!/bin/bash

export DOCKER_URL="https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
export DOCKER_INSTALLER_LOCATION="./setup/temp/DockerDesktopInstaller.exe"

# Should match python version used by the container
export PYTHON_VERSION="3.8.10"
export BACKEND_VENV_PATH="./apps/backend/.venv"

# Should match node version used by the container
export NODE_VERSION=""
