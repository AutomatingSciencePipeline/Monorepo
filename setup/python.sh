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
        source setup/exit_await_input.sh 1
    fi

    if [ "$IS_UNIX" ]; then
        curl https://pyenv.run | bash
    fi

    if command -v pyenv; then
        echo "✔ pyenv install successful"
    else
        echo "🛑 pyenv install seems to have failed"
        source setup/exit_await_input.sh 1
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
        source setup/exit_await_input.sh 1
    fi
fi

# Ensure Pip is up to date
echo "▶ Installing/updating pip"
if ! python -m pip install -U pip; then
    echo "🛑 Failed to update pip? See above error. Try just running the script again if it's a permissions issue"
    source setup/exit_await_input.sh 1
fi

if pipenv --version; then
    echo "✔ Pipenv is already installed"
else
    echo "▶ Installing pipenv"
    # Not using a --user install because that requires more stuff on PATH on windows
    # The docs suggesting a user install: https://pipenv.pypa.io/en/latest/install/#pragmatic-installation-of-pipenv
    if ! pip install pipenv; then
        echo "🛑 Failed to install pipenv? See above error. If there is no error message, try running the 'pip' command in Powershell. You may have to manually clean up more Python files and remove entries from Windows' PATH if you've previously had Python installed."
        source setup/exit_await_input.sh 1
    fi
fi

# Copy in the .env file to backend
echo "▶ Copying/updating .env file from repo root to the Backend directory"
if ! test -e ".env"; then
    echo "🛑 You don't seem to have a .env file in the repo root - follow the directions here to get one: https://github.com/AutomatingSciencePipeline/Monorepo/wiki/User-Guide#get-the-env-files"
    source setup/exit_await_input.sh 1
fi
if ! cp -f .env ./apps/backend/.env; then
    echo "🛑 Failed to copy .env file from repo root to backend?"
    source setup/exit_await_input.sh 1
fi

# Copy in the .env file to runner
echo "▶ Copying/updating .env file from repo root to the Runner directory"
if ! test -e ".env"; then
    echo "🛑 You don't seem to have a .env file in the repo root - follow the directions here to get one: https://github.com/AutomatingSciencePipeline/Monorepo/wiki/User-Guide#get-the-env-files"
    source setup/exit_await_input.sh 1
fi
if ! cp -f .env ./apps/runner/.env; then
    echo "🛑 Failed to copy .env file from repo root to runner?"
    source setup/exit_await_input.sh 1
fi


# Make pipenv store the venv inside the repo folder so tooling can expect it to be here on all dev machines
# https://github.com/pypa/pipenv/issues/746#issuecomment-332752603
# https://pipenv.pypa.io/en/latest/install/#virtualenv-mapping-caveat
export PIPENV_VENV_IN_PROJECT=1

# Install python package dependencies (pipenv will also create the venv if it doesn't exist yet)
if ! cd apps/backend; then
    echo "🛑 Failed to change dir to backend directory?"
    source setup/exit_await_input.sh 1
fi

# --dev flag means it grabs dev dependencies too
# https://pipenv-fork.readthedocs.io/en/latest/basics.html#pipenv-install
if ! pipenv install --dev; then
    echo "🛑 Failed to install or update backend dependencies, check above error for more details"
    source setup/exit_await_input.sh 1
fi

cd ../..

# Install python package dependencies (pipenv will also create the venv if it doesn't exist yet)
if ! cd apps/runner; then
    echo "🛑 Failed to change dir to runner directory?"
    source setup/exit_await_input.sh 1
fi

# --dev flag means it grabs dev dependencies too
# https://pipenv-fork.readthedocs.io/en/latest/basics.html#pipenv-install
if ! pipenv install --dev; then
    echo "🛑 Failed to install or update backend dependencies, check above error for more details"
    source setup/exit_await_input.sh 1
fi

cd ../..