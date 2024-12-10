# Local Version of GLADOS

This guide is meant for developers contributing to GLADOS that want to test changes on their local machines. This guide will utilize minikube, docker, and the GLADOS images.

## Install Dependencies

!!! Warning
    As of November 2024, GLADOS cannot run locally on M-Series Mac computers

Helm is needed for this installation. Install with:

```bash
    brew install helm #(Intel Mac)
    winget install Helm.Helm
```

Also ensure that Docker Desktop is installed and open.

Finally, ensure that kubectl and minikube are installed using:

```bash
    brew install kubectl #(Intel Mac)
    winget install kubectl

    brew install minikube #(Intel Mac)
    winget install minikube
```

## Setup Kubernetes Cluster on Minikube

First, start minkube using:

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
run minkube ssh

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

Then you must expose the newly created service on minkube to actually access the website from the url that is provided in the terminal.

```bash
minikube service glados-frontend-nodeport --url
```

This will have a version of the mainline glados running in your minikube environment.

## Push and Use Docker Images

In order to use the code in your local environment, you will need to build and push the docker images you have made changes to. 

### Building and Pushing Docker Images

In a terminal CD to the component you wish to test. For example, if I made changes to the frontend I would

```bash
cd apps/frontend
```

Next we need to build the docker image. This is done with the following command:

```bash
docker build -t {DOCKER HUB USERNAME}/glados-frontend:main . -f frontend.Dockerfile
```

This may make a couple of minutes to build.

You can do the same for the backend and runner.

Next we need to push our docker images to docker hub. Sign into your docker hub account with the following command:

```bash
docker login
```

Follow the instructions in the terminal to login.

Now we can push this image!

```bash
docker push {DOCKER HUB USERNAME}/glados-frontend:main
```

Our image is now on docker's image library!

### Using our published docker images
Inside of the kubernetes_init folder, there are a couple of items of interest.

1. backend/deployment-backend.yaml
2. frontend/deployment-frontend.yaml

If you open these files you will see that on line 20 the image is set. Change this to your image that you published to your docker hub.

Now we need to make sure we are in the project root in our terminal and execute:

```bash
python3 ./kubernetes_init/init.py --hard
```

You can then use the command:

```bash
kubectl get pods
```

Which will show something like

```bash
NAME                                        READY   STATUS    RESTARTS       AGE
glados-backend-687fc6b7ff-dld2p             1/1     Running   0              74s
glados-frontend-5f575b99b7-9q9ml            1/1     Running   0              74s
glados-mongodb-0                            1/1     Running   1 (2m9s ago)   20d
glados-mongodb-1                            1/1     Running   1 (2m9s ago)   20d
glados-mongodb-arbiter-0                    1/1     Running   2 (20d ago)    20d
```

Using the image that you replaced run:

```bash
kubectl describe pod {POD NAME FROM LAST STEP}
```

This will then show the image information. Make sure this points to your docker hub.

!!! Warning
    Make sure to change the deployment yaml back before merging!!!!

In order to update the runner image, go to the apps/backend folder, and update the image in job-runner.yaml following the steps above.

Now you can use locally built images to run GLADOS!

## Prebuilt Script for Docker Image Management

Due to the complexity of getting Minikube to behave, I have created a python script to run the needed commands for you. 

From the root of the Monorepo run the command:

```bash
python3 .\development_scripts\local\setup_local.py <args>
```

You can provide arguments for which elements of the project you would like to build.

Options are: frontend, backend, runner, all

In the python3 file you will need to set a couple of values to make sure that it is setup for your environment. Update those values and run the python script with the pieces you would like to build and push.

Note: You still need to make sure to follow the steps above for changing the image which you are running the cluster from.

After running the python script you will see something like:

```bash
Frontend is now running at: http://localhost:64068
```

Opening that link will bring you to a local version of GLADOS.

!!!Warning
    With the local version of GLADOS being HTTP you may have weird networking issues due to the max number of connections to an HTTP/1.1 host. This will be fixed in a later update.
