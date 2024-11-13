# Kubernetes Troubleshooting

This page is to give some background for some important Kubernetes Commands that may help you when trying to detemine issues with the development or production clusters.

!!! note
    The developement deployment of GLADOS has a single node, while the production deployment of GLADOS contians all of the machines that are listed on the VMs page. This does change how networking is done between pods and makes these commands much more beneficial if a problem doesn't appear in dev but shows up in production.


## Cluster Information Commands

These commands are helpful to gain more information on what is happening inside the cluster and if any errors have occurred

### kubectl get nodes

```bash
    kubectl get nodes
```

This is how one can see the notes that exist on the cluster. For example, here is what it would show when run on GLAODS dev:

```bash
NAME         STATUS   ROLES           AGE    VERSION
glados-dev   Ready    control-plane   6d2h   v1.31.1
```
!!! note
    Since this is the development environment, all pods are hosted on the control-plane node. This is NOT the case in production, as shown below. This can things to work in development and not in production due to networking, so be careful to account for it when testing.

And here is what it would show on production:
```bash
NAME        STATUS   ROLES           AGE   VERSION
glados      Ready    control-plane   19d   v1.31.1
glados-db   Ready    <none>          19d   v1.31.1
glados-w0   Ready    <none>          19d   v1.31.1
glados-w1   Ready    <none>          19d   v1.31.1
glados-w2   Ready    <none>          19d   v1.31.1
```
### kubectl get pods

```bash
    kubectl get pods
```

This is how one can see the pods that exist on the cluster. For example, here is what it would show when run on GLAODS dev:

```bash
    NAME                                   READY   STATUS    RESTARTS   AGE
deployment-test-backend-695f5ccdd9-5ww9m   1/1     Running   0          139m
deployment-test-frontend-74d65c466-ck7jq   1/1     Running   0          18m
glados-mongodb-0                           1/1     Running   0          5d5h
glados-mongodb-1                           1/1     Running   0          5d5h
glados-mongodb-arbiter-0                   1/1     Running   0          5d5h
```

### kubectl get services

```bash
    kubectl get services 
    OR
    kubectl get svc
```

This is how one can see the various services that are being run on the cluster. Use this information to ensure that the frontend, backend, and mongo database services exist like shown in the example below. If one is missing it could be the cause of a problem.

!!! note
    Due to new improvements to the MongoDB on the system, there are services that must be running to ensure that the database is kept updated and the change listener is working. These services include: glados-mongodb-arbiter-headless, glados-mongodb-0-external, and glados-mongodb-1-external

Here is an example of what should be shown:
```bash
NAME                              TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)           AGE
deployment-test-frontend          LoadBalancer   10.101.74.102    137.112.104.86   80:31102/TCP      6d
glados-backend-nodeport           NodePort       10.98.119.170    <none>           5050:32149/TCP    5d5h
glados-mongodb-0-external         NodePort       10.105.232.206   <none>           27017:30000/TCP   5d5h
glados-mongodb-1-external         NodePort       10.101.61.175    <none>           27017:30001/TCP   5d5h
glados-mongodb-arbiter-headless   ClusterIP      None             <none>           27017/TCP         5d5h
glados-service-backend            ClusterIP      10.111.125.119   <none>           5050/TCP          6d
glados-service-mongodb            ClusterIP      None             <none>           27017/TCP         5d5h
kubernetes                        ClusterIP      10.96.0.1        <none>           443/TCP           6d
```

### kubectl get logs