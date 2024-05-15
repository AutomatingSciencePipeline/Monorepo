# Developer Installation

This guide contains a short tutorial on getting a local development environment up and running.

!!! warning

    As of March 2024, we have shifted towards running the system on Kubernetes, rather than Docker. These steps still work with the current codebase, but as we fully migrate the codebase to our Kubernetes version, these steps will need to be updated accordingly.

!!! note

    These steps mainly concern developing on a Windows computer, with Git Bash. Steps on other OS's, or with WSL terminal, will have the same steps, although the specific steps on installation, as well as configuration, may differ.

## Dependencies

If you have already followed the [Installation guide](installation.md), [skip ahead](developer_installation.md#tool-installation). If not, continue reading.

## Required Tools

### Git

Git is a code version management tool that integrates with Github, where our codebase is stored. 

If you don't already have it installed, you can download it on the [git website](https://git-scm.com/downloads).

### Docker

Docker is a utility that manages small virtual machine "containers."

To install it, follow the instructions on [Docker's documentation](https://docs.docker.com/get-docker/).
Alternatively, running our install script will install Docker for you.

You might encounter a permissions error on Windows
mentioning not being part of the docker-users group.
Directions to fix that can be found [here](https://icij.gitbook.io/datashare/faq-errors/you-are-not-allowed-to-use-docker-you-must-be-in-the-docker-users-group-.-what-should-i-do).

#### WSL Error

To get Docker to work properly, you will need to install WSL.
This may fail for Windows. In this case, check that virtualization is enabled in the BIOS.

## Retrieve the Code

In a location of your choice in a drive with at least 1 GB of free space,
use Git to clone the repo.

Your command will probably look like this:

```bash
git clone --recurse-submodules https://github.com/AutomatingSciencePipeline/Monorepo.git
```

Or this if you have [ssh keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) set up (Recommended):

```bash
git clone --recurse-submodules git@github.com:AutomatingSciencePipeline/Monorepo.git
```

The `--recurse-submodules` can be omitted if you don't want to download a copy of the docs as well.

If cloning isn't working for some reason,
you can download a zip from [here](https://github.com/AutomatingSciencePipeline/Monorepo/archive/refs/heads/main.zip) instead.
Note that, if you download a zip, Windows or antivirus programs may block you from running the code,
in which case you will have to navigate various security dialogs to unblock it.
It may also not have the correct line endings (CRLF vs LF) for your system.

## Get the .env file(s)

The system keeps track of private keys (strings that act as passwords to various services) in a `.env` file.
To maintain privacy, these cannot be publicly distributed with the rest of the code.

You can get a copy of our `.env` file from our private Discord in the [#env-files channel](https://discord.com/channels/1017208818989539368/1042935101601873970). Note that you must already be a member of the Discord to open this link; contact us if you need access.

The file should be named exactly `.env` and placed in the root folder of the repository.

#### Alternative: Set up your own .env file

You can create your own `.env` file, if you want to set up your own GLADOS system. There is an `.example.env` file in the repository that has sample fields to fill in. During this process, you will need to set up a Firebase project for account management. Note that the frontend code has the Firebase public key in it, which does not need to be secure, but will need to be replaced when hosting your own GLADOS system.

## Tool Installation

We include a `dev-install.sh` script that assists in the process of installing everything needed to develop on the system. This setup process includes:

* Installing Docker
* Installing Python 3.8 via pyenv
* Creating pipenvs for both the backend and documentation packages, containing project dependencies
* Installing Node.JS via npm, with project dependencies

Of course, it is recommended to look through the scripts themselves, before running it, for a sanity check.

To run the script, run the following command with a Git Bash terminal in the root folder of the repository:

```sh
bash dev-install.sh
```

This process may require you to close and reopen the terminal, uninstall programs you may have, or restart your computer. You may need to run the script multiple times, as a result.

## Install Minikube and related tools

Minikube allows you to easily run a Kubernetes cluster locally on your machine, mainly for learning and testing purposes. 

To install it, follow the instructions on [Minikube's documentation](https://minikube.sigs.k8s.io/docs/start/). You must have Docker installed already, unless you have another [minikube driver](https://minikube.sigs.k8s.io/docs/drivers/) you prefer.

Additionally, some tools are required to work with kubernetes. 
Kubectl allows you to interact with the cluster through the command line. To install it, [follow the instructions here](https://kubernetes.io/docs/tasks/tools/#kubectl), for your OS.
Python Kubernetes Client works the same way, but through Python instead of the command line. This is used to set up the system easily. To install it, [follow the instructions here](https://github.com/kubernetes-client/python?tab=readme-ov-file#installation). If preferred, you may also set this up in a separate pyenv, much like what is done in the `dev-install.sh` script.

Ensure you can start minikube and interact with the cluster with kubectl before continuing.

## IDE Setup

We strongly suggest using Visual Studio Code (VSCode) as your IDE.
Numerous configuration files and utilities, such as suggested extensions, are already included with the repo.

It can be downloaded [here](https://code.visualstudio.com/download).

After installing VSCode, you should install the recommended extensions after opening the repository in VSCode. A prompt may appear after opening the project, but if not, you can also go to the Extensions view, filter by '@recommended', and install the extensions under 'Workspace Recommendations'.

Configure the python interpreter via Ctrl+Shift+P > `Python: Select Interpreter` > `Use Python from 'python.defaultInterpreterPath' setting`

### Check Linter Setup

In order to test the frontend linter, we'll introduce a syntax error and make sure that it reports it as a problem. You can undo this change after you're done.

* Open `/apps/frontend/pages/_app.tsx`
* Add the line `var unused = 'hi';` as shown in the screenshot below and confirm that the same 3 errors are reported when you hover over the symbol `unused`.

![Intentional Error](https://i.imgur.com/6at100I.png)

If the linter doesn't detect 3 errors, make sure the recommended extensions are installed, and check the VSCode "Output" View, select ESLint from the dropdown, and check for any errors.

You may run into CI issues, with build failures, without a working linter.

You are now fully set up to develop on the system!

## Launching the project with Minikube

To launch GLADOS locally, first start minikube. Then, you can run our `kubernetes/init.py` script to start all the resources. Here are the commands:

```bash
minikube start
python3 kubernetes/init.py --hard
```

Sometimes it fails to create all the resources. To fix this, run the script again.

To ensure it is running, list all resources via:

```bash
kubectl get all
```

There should be four deployments. They may take a while to start up, so be patient. To debug, you may also use the minikube dashboard via:

```bash
minikube dashboard
```

Once all the deployments are ready, you will need to port forward the frontend manually, via:

```bash
kubectl port-forward pod/deployment-test-backend-<ID stuff> 8080:8080
```

This will allow you to view the frontend on http://localhost:8080.

To update the system, you will need to rebuild and push the images, then recreate the system, using `python3 kubernetes/init.py --hard`. Ensure it is building using the same images you just pushed, within each deployment manifest.

## Quick Launching with Docker

!!! note

    Docker is used to run an older version of GLADOS that does not allow multiple experiments to be ran at the same time. However, some of our current development is done through running on Docker, as the system has not fully migrated to Kubernetes. As of May 15, 2024, the `main` branch is ran via Kubernetes, and all other branches are ran via Docker.

You can quickly build and launch all service containers via VSCode Tasks.

Ctrl+Shift+P > `Tasks: Run Task` > `DEVELOPMENT Docker Compose Up (Attached)`

If you don't want to use VSCode tasks to start the commands, look at the `.vscode/tasks.json` file to see what commands are run behind the scenes.

This supports enable hot reloading for the backend and frontend.
Once the docker containers are built (this will take a while for the first run) you should start seeing log messages from the containers.

The Docker Desktop application will tell you what port the frontend is accessible from, but it should match the port specified in your `.env` file.

![Docker Desktop screenshot](https://i.imgur.com/W8zJPks.png)

Click on the link shown in the screenshot and it should open a page to the frontend in your browser.
Once you try to connect, the frontend will start to build for hot reloading.

The frontend's hot reloading is really slow at first but gets better after its first builds are done. It may take up to **a few minutes** to turn on for the first time.
While it is building, your browser will be sitting on a blank page still trying to connect. This is normal.

After it finishes loading, you should be taken to the homepage.

## Extras

!!! note

    These are optional resources that you may consider using, although we have found a simpler setup to work better.

### Remote Development Extensions

The Remote Development extension pack for VS Code allows you to connect your IDE to connect to remote servers, or containers, and develop from them as if they were your local computer.

It can be installed with [this quick install link](vscode:extension/ms-vscode-remote.vscode-remote-extensionpack)
or downloaded via its [marketplace page](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack).
