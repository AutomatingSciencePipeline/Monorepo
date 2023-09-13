#!/bin/bash

# Copy in the .env file
echo "▶ Copying/updating .env file from repo root to the Frontend directory"
if ! test -e ".env"; then
    echo "🛑 You don't seem to have a .env file in the repo root - follow the directions here to get one: https://github.com/AutomatingSciencePipeline/Monorepo/wiki/User-Guide#get-the-env-files"
    source setup/exit_await_input.sh 1
fi
if ! cp -f .env ./apps/frontend/.env; then
    echo "🛑 Failed to copy .env file from repo root to frontend?"
    source setup/exit_await_input.sh 1
fi

if command -v nvm; then
    echo "✔ nvm (node version manager) is already installed"
else
    echo "▶ nvm (node version manager) is not yet installed"

    if command -v node -v; then
        EXISTING_NODE_VERSION=$(node -v)
        echo "🛑 Node.js is already installed, but not nvm (node version manager). You need to uninstall your copy of Node to ensure that Node does not get confused and try to install the project's packages for the wrong node install. Don't worry, you can use nvm to install the version of node you already have installed (which is ${EXISTING_NODE_VERSION})"
        echo "After this, the script will install node (the version required for this project) again for you."
        echo "It is suggested you do so with Windows' 'Add or Remove Programs' tool"
        echo "More info here: https://codedamn.com/news/nodejs/how-to-uninstall-node-js#Uninstalling_the_Nodejs_in_Windows"
        echo "Docs on how to use nvm to re-install the other Node install: https://heynode.com/tutorial/install-nodejs-locally-nvm/"
        echo "Your current node install is located at:"
        which node
        source setup/exit_await_input.sh 1
    else
        echo "✔ Node.js is not yet installed. It's safe to proceed with installing nvm."

        if [ "$IS_WINDOWS" ]; then
            if test -e "${NVM_WINDOWS_INSTALLER_LOCATION}"; then
                echo "▶ nvm-windows installer already exists at ${NVM_WINDOWS_INSTALLER_LOCATION}"
            else
                echo "▶ Downloading nvm-windows installer from ${NVM_WINDOWS_URL}"
                echo "▶ and placing it at ${NVM_WINDOWS_INSTALLER_LOCATION}"
                # -L flag needed for https https://stackoverflow.com/a/27458981
                curl "${NVM_WINDOWS_URL}" -L > "${NVM_WINDOWS_INSTALLER_LOCATION}"
            fi
            
            echo "⚠ Installing nvm-windows. This may open an admin prompt you have to accept. Afterwards, you'll have to re-run this script in a new shell (or it'll just try to run this installer again)."
            ${NVM_WINDOWS_INSTALLER_LOCATION}
            source setup/exit_await_input.sh 1
        fi

        if [ "$IS_UNIX" ]; then
            echo "▶ Installing nvm via curl"
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
        fi
    fi
fi

if nvm list | grep "${NODE_VERSION}" -q; then
    echo "✔ nvm has a copy of ${NODE_VERSION} installed "
else
    echo "▶ nvm does not yet have a copy of ${NODE_VERSION} installed. Installing it"
    nvm install "${NODE_VERSION}"
fi

if nvm current | grep "${NODE_VERSION}" -q; then
    echo "✔ nvm already using ${NODE_VERSION}"
else
    echo "⚠ Using nvm to switch to node ${NODE_VERSION} (you may need to ok an admin prompt)"
    nvm use "${NODE_VERSION}"
fi

FOUND_VERSION=$(node -v)
if grep "${NODE_VERSION}" -q <<< "$FOUND_VERSION" ; then
    echo "✔ Node.js version ${NODE_VERSION} was found on path"
else
    echo "🛑 Somehow the detected node version (${FOUND_VERSION}) is not what was switched to with nvm (${NODE_VERSION}), do you have another node install that is interfering?"
    echo "You might need to re-run the script if nvm just installed node for you"
    source setup/exit_await_input.sh 1
fi

# TODO pnpm install fails on windows, seems to be because it's launched from inside git bash?
# we can just use npm for now, but pnpm has better performance

# if command -v pnpm; then
#     echo "✔ pnpm is installed"
# else
#     echo "▶ pnpm is not yet installed. Installing..."

#     if [ "$IS_WINDOWS" ]; then
#         echo "ℹ If the next command fails due to permissions problems, you probably need to run \`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned\` to change powershell permissions"
#         echo "ℹ https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-7.3"
#         powershell ./setup/windows-pnpm-install.ps1
#         echo "⚠ pnpm install ran. You need to restart the terminal session you're in so that pyenv is recognized as installed. You may need to restart your computer"
#         # exit 1
#     fi

#     if [ "$IS_UNIX" ]; then
#         curl -fsSL https://get.pnpm.io/install.sh | sh -
#     fi
# fi

if command -v npm; then
    echo "✔ npm is installed"
else
    echo "🛑 npm is somehow not installed, nvm should have handled this for us?"
    source setup/exit_await_input.sh 1
fi

echo "▶ Installing and updating frontend Node dependencies (this could take a bit)"
if ! cd apps/frontend; then
    echo "🛑 Failed to change dir to frontend directory?"
    source setup/exit_await_input.sh 1
fi

if ! npm install --loglevel=error; then
    echo "🛑 Failed to install or update frontend dependencies via npm, check above error for more details. Consider changing the log level arg (this script has it set to error or higher only)"
    source setup/exit_await_input.sh 1
fi

cd ../..
