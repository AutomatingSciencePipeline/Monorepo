# Glados Virtual Machines

To run the cluster we have created several virtual machines that are hosted by Rose-Hulman. The docs below will layout how these virtual machines are structured.

| VM Host Name     | Description                                                                                     | Specs                                                                        | What runs here?
| -----------      | ------------------------------------                                                            | ------------------------------------                                         | --------------------------------
| glados-cp           | This VM will run the kubernetes control plane. See above for the function of the control plane  | 2 CPU cores, 4GB of RAM, 50GB of storage                                     | control-plane
| glados-db        | This VM will run and store the MongoDB.                                                         | 4 CPU cores, 8GB of RAM, 1TB of storage?, ability to run AVX instructions    | database
| glados-w1        | This will be a general worker node.                                                             | 4 CPU cores, 8GB of RAM, 50GB of storage                                     | non-specific
| glados-w2        | This will be a general worker node.                                                             | 4 CPU cores, 8GB of RAM, 50GB of storage                                     | non-specific
| glados-dev       | This will run a cluster used for development. Basically a staging environment.                  | 4 CPU cores, 8GB of RAM, 100GB of storage                                    | Entire cluster
| glados-forge     | This will run individual VMs for development containers.                                        | 16 CPU cores, 32GB of RAM, 500GB of storage                                   | Dev containers

!!! note

    If we need more worker nodes they can follow the scheme above, glados-w3, glados-w4, etc.

## Justification

The glados host name will only run the control plane because it will be able to keep running in the case that another system goes down. The control plane is able to redistribute tasks in the case of a system crash. This system does not need a lot of resources since it is only directing the work to the rest of the cluster.

Glados-db will run the MongoDB, this means that it may need quite a bit of persistent storage. Therefore we need quite a bit of storage on this VM. MongoDB also appears to be quite resource intensive.

Glados worker nodes can all be the same specs and can be spun up/down as they are needed. When adding/removing nodes you will have to instruct the control plane to do so.

## Development Environment

We would also like a VM to run a development version of GLADOS for our own testing.

### Hostname

glados-dev

### Description

Run the cluster on a single machine for testing purposes.

### Specs

4 CPU cores, 8 GB RAM, 100GB storage

We might need a little extra storage due to kubernetes caching old images. We will have to make sure we clean this up periodically.

## Physical Server

We will continue to use the physical GLADOS server in the cluster. We will use the physical server as a worker node (worker 0). The physical server will now have the hostname glados-w0.

## glados-forge

This VM is used for development purposes for the GLADOS team. It is configured to create and manage development environments for each member of the GitPod organization, allowing each person to maintain their own environment and changes for the work they are completing to enhance the system.

The development environments are dynamically spun up and down as needed to preserve the ram and CPU usage on the VM.
