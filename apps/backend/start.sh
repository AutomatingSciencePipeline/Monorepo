#!/bin/bash

# env vars on windows sucks, trying to find out how to read them from file but spaces and multi-line complicates it... so just load them by running a bash script :(

unset IS_WINDOWS
# https://stackoverflow.com/questions/394230/how-to-detect-the-os-from-a-bash-script
if [[ "$OSTYPE" == "cygwin" ]]; then
    # POSIX compatibility layer and Linux environment emulation for Windows
    IS_WINDOWS=true
elif [[ "$OSTYPE" == "msys" ]]; then
    # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
    IS_WINDOWS=true
elif [[ "$OSTYPE" == "win32" ]]; then
    # I'm not sure this can happen.
    IS_WINDOWS=true
fi

if [ "$IS_WINDOWS" ]; then
    if test -e "./dev-windows-set-environment-vars.sh"; then
        echo "Running on Windows - loading env vars via gitignored bash script"
        # shellcheck disable=SC1091
        source dev-windows-set-environment-vars.sh
    else
        echo "🛑 You're running this on Windows, which means you need to manually create a script that sets certain env vars for the Python application"
        echo "There's an example of this script in /apps/backend/dev-windows-set-environment-vars.example.sh"
        echo "If you're seeing this message and you have that file, make sure you're running this script from the /apps/backend directory"
        exit 1
    fi

    if test -z "${VIRTUAL_ENV}"; then
        echo "🛑 You're running this on Windows, you need to activate the python virtual environment before this can start"
        exit 1
    fi
fi

# TODO switch to ${BACKEND_PORT}
flask run --host=0.0.0.0 -p 5050
