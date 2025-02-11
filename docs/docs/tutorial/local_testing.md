# Local Version of GLADOS

This guide is meant for developers contributing to GLADOS that want to test changes on their local machines. This guide will utilize minikube, docker, and the GLADOS images.

There are two potential options to run GLADOS locally:

* VSCode Dev Containers
* Minikube and Tilt locally

Both of these rely on having install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (scroll down to find the download button).

## VSCode Dev Containers

This method uses all of the same technologies and programs as the "Minikube and Tilt locally" method, but it is run inside of a single Docker container. This is a Docker in Docker solution in order to not have to setup all of the dependencies by hand.

### Windows Setup

On Windows you will most likely be using the WSL2 backend for Docker Desktop, follow [this guide](https://docs.docker.com/desktop/features/wsl/) to ensure the WSL2 backend is used.

!!! Note
    Make sure to use Ubuntu as the distribution of choice.

WSL2 has one small quirk... inotify, which is used to live update the files inside of Tilt (you can read more about this in the Tilt section below), is not supported on mounted files in WSL2. This means that files that are shared between Windows and WSL cannot be watched properly.

The way around this issue is to copy all of the files into WSL2 before we start the dev container.

In the .devcontainer folder in the root of the Monorepo, you will find a script named `start_in_wsl.py`.

Run this script from the *root* of the Monorepo (this is important!!!!):

```bash
python ./.devcontainer/start_in_wsl.py
```

!!! Warning
    All changes in the WSL2 instance will be overwritten!!!!!

!!! Note
    Run with the -y flag to skip the confirmation about overwriting files.

This command will copy the current state of the Monorepo into WSL2, rerun this every time you wish to start a developing session in WSL2.

Once you are inside the VSCode window, you will be prompted in the bottom right to open this repo in a container. If you miss this, you can also press F1 and then search for "Rebuild and Reopen in Container".

After everything is setup, you can type `tilt up` from the root of the Monorepo. You can then open `localhost:10350` in your web browser to manage Tilt.

All done! You now are running a development environment docker container!

## Tilt

This method will create a two Docker containers running on your system. One to manage Minikube and another to act as an image repository. These are both setup and configured using ctlptl (cattle patrol).

### Install Dependencies

!!! Warning
    As of November 2024, GLADOS cannot run locally on M-Series Mac computers

!!! Note
    Winget is installed via the [Microsoft Store](https://apps.microsoft.com/detail/9nblggh4nns1?hl=en-US&gl=US).

Helm is needed for this installation. Install with:

```bash
    brew install helm # (Intel based Mac)
    winget install Helm.Helm # (Windows)
```

Also ensure that Docker Desktop is installed and open.

Finally, ensure that kubectl and minikube are installed using:

```bash
    brew install kubectl # (Intel based Mac)
    winget install kubectl # (Windows)

    brew install minikube # (Intel based Mac)
    winget install minikube # (Windows)
```

##

### What is Tilt

Tilt for Kubernetes is a tool that streamlines the local development of Kubernetes applications. It automates building container images, deploying them to a cluster, and live-reloading changes in real time. It watches for code updates, rebuilds affected services, and provides a dashboard to monitor logs and resource statuses, making it easier to iterate quickly without manually managing Kubernetes configurations.

### Why use Tilt

The biggest reason for using Tilt is that is has a feature called "live_update". Live update allows us to use the hot reload feature in NextJS to see changes almost instantly. Tilt will update running pods with new files to reflect changes.

### How to use Tilt

If you have followed the guide up to this point you will have the main line GLADOS running on your system. Unfortunately we are going to have to discard that progress.

### If you already have Minikube running on your system

!!! Warning
    Run the following commands *only* if you have currently have a Minikube cluster running on your machine.

Make sure that Docker Desktop is running.

Run the following command:

```bash
minikube delete
```

### Start here if you do not have a Minikube instance

We will have to install a couple of prerequisite programs.

#### Windows

If you have Scoop installed, skip the Scoop install commands.

```bash
# Install Tilt
iex ((new-object net.webclient).DownloadString('https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.ps1'))

# Now we need to install Scoop, skip if Scoop is already installed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Next we are going to install ctlptl
scoop bucket add tilt-dev https://github.com/tilt-dev/scoop-bucket
scoop install ctlptl

# Run the following to make sure everything is working
tilt version
ctlptl version
# Restart your terminal if any errors are displayed

# Now we need to start the Minikube cluster
# This will also create a image registry in Docker Desktop
ctlptl create cluster minikube --registry=ctlptl-registry
```

#### MacOS

```bash
# Install Tilt
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

# Install ctlptl, this is dependent on you having Homebrew installed
brew install tilt-dev/tap/ctlptl

# Run the following to make sure everything is working
tilt version
ctlptl version
# Restart your terminal if any errors are displayed

# Now we need to start the Minikube cluster
# This will also create a image registry in Docker Desktop
ctlptl create cluster minikube --registry=ctlptl-registry
```

#### Running Tilt

Now that you have the Minikube cluster running, we need to [setup MongoDB](#setup-mongodb-cluster). Come back to here once you have MongoDB running in the Minikube Cluster.

Open a terminal window and navigate to the root of the Monorepo

Run the following:

```bash
tilt up
```

Now you can press space bar to open the Tilt GUI in your web browser.

The GLADOS frontend will be accessible at <http://localhost:3000>.

Any code changes made will automatically update the running pods.

Updating the frontend and backend cause live updates, updating the runner will cause a rebuild to take place.

In the Tilt GUI there are refresh buttons to manually refresh running pods, use this button if you see any weirdness with the backend and frontend not talking to each other properly.

Congrats! You now have the development environment all setup!
