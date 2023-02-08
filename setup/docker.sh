#!/bin/bash

# `command -v` returns 0 if command success or 1 if failure
# `> /dev/null ` silences the output (otherwise it prints where it was found)
if command -v docker > /dev/null; then
    echo "✔ Docker is already installed"
else
    echo "▶ Docker is not installed"

    if [ "$IS_WINDOWS" ]; then
        if test -e "${DOCKER_INSTALLER_LOCATION}"; then
            echo "▶ Docker Desktop installer already exists at ${DOCKER_INSTALLER_LOCATION}"
        else
            echo "▶ Downloading Docker Desktop installer from ${DOCKER_URL}"
            echo "▶ and placing it at ${DOCKER_INSTALLER_LOCATION}"
            curl "${DOCKER_URL}" > "${DOCKER_INSTALLER_LOCATION}"
        fi

        echo "⚠ Installing Docker. This may open an admin prompt you have to accept. Afterwards, you'll have to restart Windows as its GUI will prompt. Then you'll have to re-run this script."
        # https://docs.docker.com/desktop/install/windows-install/#install-from-the-command-line
        ${DOCKER_INSTALLER_LOCATION} install --accept-license --backend=wsl-2
        source setup/exit_await_input.sh 1
    fi

    if [ "$IS_UNIX" ]; then
        echo "🛑 TODO install requesite docker stuff on unix systems"
        # https://docs.docker.com/desktop/faqs/linuxfaqs/#what-is-the-difference-between-docker-desktop-for-linux-and-docker-engine
        source setup/exit_await_input.sh 1
    fi
fi
