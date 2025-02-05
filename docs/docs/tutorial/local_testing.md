# Local Version of GLADOS

This guide is meant for developers contributing to GLADOS that want to test changes on their local machines. This guide will utilize minikube, docker, and the GLADOS images.

## Install Dependencies

!!! Warning
    As of November 2024, GLADOS cannot run locally on M-Series Mac computers

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

## Setup Kubernetes Cluster on Minikube

!!! Warning
    If you are using [Tilt](#tilt), click the link to jump to that section or you will have to redo some of your work!

First, start Minikube using:

```bash
    minikube start
```

Once that is complete, a Kubernetes cluster is running. Confirm this using:

```bash
    kubectl get nodes
```

## Setup MongoDB Cluster

From the root of the GLADOS repository, run this command:

```bash
    kubectl apply -f helm_packages/mongodb-helm/pvs.yaml
```

This creates the persistent volumes that the MongoDB uses.

Now, use Helm to install the GLADOS MongoDB registry from DockerHub. This is necessary for the setup of the Mongo replica set for the change listener.

!!! Warning
    When using GLADOS on the local machine, this section of the values.yaml inside helm-packages/mongodb-helm package needs to be commented out:
    ```bash
    affinity:
        nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
                - matchExpressions:
                    - key: "kubernetes.io/hostname"  # Key for the node selector
                    operator: In
                    values:
                        - "glados-db"  # Replace with the name of the node you want to use
    ```
    Not doing so will result in local testing to be impossible.

```bash
    helm install glados-mongodb oci://registry-1.docker.io/bitnamicharts/mongodb -f helm_packages/mongodb-helm/values.yaml
```

### Ensure that Mongo Replica Set Has Proper Permissions

```bash
minikube ssh

cd /srv/data

sudo chown -R 1001:1001 mongo-1/

sudo mkdir mongo-2/

sudo chown -R 1001:1001 mongo-2/

exit
```

Now, check to make sure that all 3 mongo-related pods are running using ```kubectl get pods```

The result should be:

```bash
NAME                              TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)           AGE
glados-mongodb-0-external         NodePort    10.102.161.47   <none>        27017:30000/TCP   16m
glados-mongodb-1-external         NodePort    10.100.33.162   <none>        27017:30001/TCP   16m
glados-mongodb-arbiter-headless   ClusterIP   None            <none>        27017/TCP         16m
```

### Add Authentication to MongoDB

Now, we need to connect to the newly created MongoDB to add authentication to it. Run these commands:

```bash
kubectl exec -it glados-mongodb-0 -- mongosh --username root --password password123

use admin

db.updateUser("adminuser", { roles: [ { role: "root", db: "admin" } ] })

exit
```

Return to [Tilt Setup](#running-tilt).

## Pull Frontend and Backend Images

From the root of the Monorepo, run this command:

```bash
python3 .\kubernetes_init\init.py
```

!!! note
    With this method, every time that you push a change to the DockerHub images, you will need to run ```kubectl delete svc glados-frontend-nodeport``` and then re-expose the new pod once it is pulled from DockerHub and also recreate the minikube service.

This command is used to expose the frontend pod so that it can be accessed via port 3000.

```bash
kubectl expose pod <POD-NAME> --type=NodePort --name=glados-frontend-nodeport --port=3000 --target-port=3000 
```

Then you must expose the newly created service on minikube to actually access the website from the url that is provided in the terminal.

```bash
minikube service glados-frontend-nodeport --url
```

This will have a version of the mainline glados running in your minikube environment.

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
