# Local Version of GLADOS

This guide is meant for developers contributing to GLADOS that want to test changes on their local machines. This guide will utilize minikube, docker, and the GLADOS images.

## Install Dependencies

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

## Tilt

As of February of 2025 we have switched to using Tilt for our local development.

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
