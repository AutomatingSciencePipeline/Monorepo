#!/bin/bash
# You need Bash installed to run this script. Follow the setup directions here: https://github.com/AutomatingSciencePipeline/Monorepo/wiki

# Load variables for other script files to use (versions to download and such)
DIR="$(pwd)"
export DIR
if ! source "${DIR}/setup/variables.sh"; then
    echo "Failed to load script variables, make sure you run this script from the repo root"
    exit 1
fi

# Create the temp directory so other scripts don't fail to download stuff
mkdir -p ./setup/temp

unset IS_WINDOWS
unset IS_UNIX

# https://stackoverflow.com/questions/394230/how-to-detect-the-os-from-a-bash-script
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    IS_UNIX=true
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "WARNING: This script has not been tested on darwin systems"
    IS_UNIX=true
elif [[ "$OSTYPE" == "cygwin" ]]; then
    # POSIX compatibility layer and Linux environment emulation for Windows
    IS_WINDOWS=true
elif [[ "$OSTYPE" == "msys" ]]; then
    # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
    IS_WINDOWS=true
elif [[ "$OSTYPE" == "win32" ]]; then
    # I'm not sure this can happen.
    IS_WINDOWS=true
elif [[ "$OSTYPE" == "freebsd"* ]]; then
    echo "WARNING: This script has not been tested on freebsd systems"
    IS_UNIX=true
else
    echo "Failed to detect OS"
    source setup/exit_await_input.sh 1
fi
export IS_WINDOWS
export IS_UNIX

if ! test -e ".env"; then
    echo "⚠ You don't seem to have a .env file - follow the directions here to get one: https://github.com/AutomatingSciencePipeline/Monorepo/wiki/User-Guide#get-the-env-files"
fi

# Install Docker
source "${DIR}/setup/docker.sh"

# Install Python + packages
source "${DIR}/setup/python.sh"

# Install Node
source "${DIR}/setup/node.sh"

# TODO minikube + kubectl (+ helm) install script?
# this was avoided for now due to time, and avoiding running powershell as admin, though that's probably necessary.

# Done (hopefully)

# echo "🚀 Environment setup/update completed (probably)"
echo "============================================================================================="
echo "🛑 You will need to manually install Minikube, kubectl, and python-kubernetes-client for now."
echo "============================================================================================="
echo "▶ Before you begin working in Python in each new terminal shell, activate the respective pyenv by running \`source <apps/backend,apps/runner,docs>/.venv/Scripts/activate\` from the repo root to enter the Virtual Env. You do NOT need to use \`pipenv shell\` like pipenv suggests. You should see \`(backend)\` on your console line when you are in a virtual env. To exit the venv, just close the shell or send the command \`deactivate\`."
echo "▶ Note that VSCode might automatically do this for you in new terminal windows."
source setup/exit_await_input.sh 0
