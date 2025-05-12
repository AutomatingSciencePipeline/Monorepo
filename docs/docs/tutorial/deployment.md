# Deployment

This guide contains the steps to deploy changes to the GLADOS frontend, backend, and mongoDB nodes to test changes made to the codebase. It will setup the settings on a machine that has the Monorepo codebase and will complete all of the required prerequisite installation tasks.

!!! note
    This is a living document as of September 2024. Updates will be provided as new approaches to development deployment are implemented for easier CI/CD practices for the dev team.

!!! note
    This page is only how to use the setup scripts, if a detailed understanding of the scripts are needed for debugging, see the [Developer Deployment](developer_deployment.md) page.

## Setup VM

!!! warning
    Ensure that the terminal is directed to the outermost level of the Monorepo before running the following commands.

There are two setup machine scripts. One is for Debian and the other is for Ubuntu. Choose the correct one for your setup.

Before you can run the file, you need to make it executable. To do this, running the following command:

```bash
    chmod +x Debian_Setup_Machine.sh
```

The first script is to set up the settings machine to run the GLADOS deployment. Run this command, then follow the prompts.

```bash
    ./Debian_Setup_Machine.sh
```

!!! note
    Ensure to follow the echo command that is shown at the end of the script. Not doing so will result in the deployment to fail.

## Deploy Cluster

Before you can run the file, you need to make it executable. To do this, running the following command:

```bash
    chmod +x Deploy_Cluster.sh
```

The next script is to run the script that creates (or re-creates) the clusters and the images for the frontend, backend, and database. Run the following command:

```bash
    ./Deploy_Cluster.sh
```

Utilizing these two scripts should result in a new VM being created an

## Updating Cluster

To avoid having to recreate the cluster every time that new images are pushed to Docker Hub, we have added a function to the deployment Python script that just updates the images.

Run the following command from the root folder of the Monorepo.

```bash
    ./python3 kubernetes_init/init.py --update
```

## Debugging Commands

### Expose ports for the MongoDB and backend service

This command will expose a Node Port for the backend services. This will allow connections to be made to this service from outside of the cluster.

```bash
kubectl expose svc glados-service-backend --type=NodePort --name=glados-backend-nodeport --port=5050  --target-port=5050
```

The MongoDB Node Ports must be enabled in the helm values.yml files for MongoDB.

Once you change these values you can run the following command from the mongodb-helm folder:

```bash
helm upgrade -f values glados-mongodb
```

Then run:

```bash
kubectl get svc
```

This will list the services and all of their ports. This looks similar to:

```bash
NAME                       TYPE           CLUSTER-IP       EXTERNAL-IP       PORT(S)           AGE
deployment-test-frontend   LoadBalancer   10.110.22.190    137.112.156.235   80:31089/TCP      19h
glados-backend-nodeport    NodePort       10.101.44.177    <none>            5050:32636/TCP    2s
glados-mongodb-external-0  NodePort       10.109.48.36     <none>            27017:30001/TCP   2s
glados-mongodb-external-1  NodePort       10.109.48.36     <none>            27017:30002/TCP   2s
glados-service-backend     ClusterIP      10.107.96.198    <none>            5050/TCP          19h
glados-service-mongodb     ClusterIP      10.103.225.198   <none>            27017/TCP         19h
kubernetes                 ClusterIP      10.96.0.1        <none>            443/TCP           19h
```

Here you can see the glados-backend-nodeport is accessible at port 32636 and the glados-mongodb-external-0 is accessible at port 30001. You can then use Postman or similar programs to test the backend. You can also use Mongo Compass to login into the MongoDB and monitor the database. If you are using MongoDB Compass make sure that *direct connection* is selected in "advanced connection options".

### Using Dev Pull Repo

This script is designed to pull the repo and set the frontend and backend to use the development images from docker hub.

!!! warning
    Do not execute this script inside of the Monorepo! It will pull the repo again.

To run the Dev Pull Repo

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/development/development_scripts/Dev_pull_repo.sh)"
```