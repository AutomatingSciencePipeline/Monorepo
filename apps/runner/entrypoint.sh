#!/bin/sh
set -e

# Check if the user is privileged
if [ "$USER_PRIVILEGED" = "true" ]; then
    echo "User is privileged. Installing user-specified APT and PIP packages..."
    apt update && apt install -y $USER_SPECIFIED_APT_PACKAGES
    bash sh /sandbox/commandsToRun.txt
    pip install /sandbox/requirements.txt -t /sandbox/deps
    pip install /sandbox/userProvidedFileReqs.txt -t /sandbox/deps
else
    pip install /sandbox/requirements.txt -t /sandbox/deps
    pip install /sandbox/userProvidedFileReqs.txt -t /sandbox/deps
fi

# Disable networking before executing user code
echo "Disabling networking..."
unshare -n -- /sandbox/run-user-code.sh
