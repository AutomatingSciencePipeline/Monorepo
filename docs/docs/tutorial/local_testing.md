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

There you have it! A locally running version of GLADOS. See Changing the Local Version to see how to make changes and test them before pushing to the development branch.
