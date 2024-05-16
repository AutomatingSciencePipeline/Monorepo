# Kubernetes

This section gives an overview and an introduction to Kubernetes, aiming to explain concepts to someone brand new to virtualization and distributed systems.

For those who have some familiarization with virtualization, and/or have worked with Docker, [skip ahead](#kubernetes-terminology).

## Virtualization

Imagine a program that simulated everything that your laptop could do, including running an OS, installing programs, and searching the web. This program, called a **Virtual Machine**, or VM, could be ran on an actual, physical computer or server. The program would have it's own storage, processes, and interactions separate from the physical machine it is running on, even though it is all running on one physical machine.

Now imagine a computer system with everything stripped out of it except for the bare minimums required to run a single program, and have this system be simulated by a program. This is called a **container**. Much like a VM, it has all of its resources isolated from the physical machine it is running on.

Both of these allow for multiple identical virtual systems to be created and ran on any computer environment, making them versatile for development and usage.

## Images

Containers are built off of **images**, which dictate the starting configuration and environment. Oftentimes, images are built off of other images, to achieve a more specific use case. [Docker Hub](https://hub.docker.com/search), like Github, stores these images in a registry, allowing for other systems to pull images and build containers from them.

GLADOS has images made for each process in the system: the frontend, the backend, the database, and the runners. From them, we build containers that interact together within a Kubernetes cluster. This is explained in more detail [later on in this page](#production-setup).

## Kubernetes Terminology

This contains a list of brief definitions that Kubernetes uses to describe different aspects of the system.

<!-- these are definition lists, see here: https://squidfunk.github.io/mkdocs-material/reference/lists/ -->

`Pod`

:   A single container or group of containers, runs an image. This is normally managed by other resources, like Deployments or Jobs. [Reference](https://kubernetes.io/docs/concepts/workloads/pods/)

`Node`

:   A machine within the Kubernetes cluster. This can be anything from a server to VMs, and Pods run using the Node's resources (CPU, memory, storage, etc). [Reference](https://kubernetes.io/docs/concepts/architecture/nodes/)

`Cluster`

:   The overarching Kubernetes system, consisting of (usually) multiple Nodes. Each cluster has a control-plane Node that manages the interactions within the system. To learn what a cluster needs to manage the system, [skip ahead](#creating-a-cluster).

![Diagram](https://kubernetes.io/images/docs/kubernetes-cluster-architecture.svg)
Image originated from Kubernetes website.

`Deployment`

:   Manages Pod states through Replica Sets. [Reference](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

`Replica Set`

:   Maintains a set of replica Pods, all identical, to reach a certain number of Pods. [Reference](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/)

`Job`

:   Creates Pods until one successfully completes its task. Can wait for multiple successful completions. [Reference](https://kubernetes.io/docs/concepts/workloads/controllers/job/)

`Service`

:   Exposes a Pod, or group of Pods, to the cluster network, for interaction. [Reference](https://kubernetes.io/docs/concepts/services-networking/service/)

`Persistent Volume`

:   Storage provisioned from physical storage, useful to retain data independent of Pods, like database data. To learn a bit more about storing data with Kubernetes, [skip ahead](#storage). [Reference](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Creating a Cluster

Each cluster requires these things to run properly:

1. [Container Runtime](https://kubernetes.io/docs/setup/production-environment/container-runtimes/), which runs the containers. **This needs to be selected, with multiple options**.
2. [Container Network Interface](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/), or CNI, which manages Pod-to-Pod communication. **This needs to be selected, with compatability with the Container Runtime**.
3. [Kubelet](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/), which manages the nodes.
4. [kube-apiserver](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/), which manages resources. This is installed automatically as part of the control plane node.
5. [kubectl](https://kubernetes.io/docs/reference/kubectl/), which lets the user interact with the kube-apiserver, allowing you to view and make changes to the cluster.

There are many tools that help in creating a cluster, some of which abstract parts of setting this up. [Minikube](https://minikube.sigs.k8s.io/docs/) creates a locally hosted cluster, abstracting a lot of the setup for simple testing. [Kubeadm](https://kubernetes.io/docs/reference/setup-tools/kubeadm/) is a more advanced tool, requiring configuration and networking setup. On the production server, we used kubeadm to create the cluster, with Flannel as a CNI and CRI-O as the container runtime. We have used minikube to test the system setup locally.

!!! note

    Minikube is currently not part of the installation process, but will be added to the developer installation process. Additionally, detailed steps to set up a kubernetes system will be added in the near future.

## Networking

By default, pods are closed off from other pods. To connect to other pods, a **Service** is needed to expose a pod (or multiple pods) to the network. Services also have the capability to expose things to the outside world. For the frontend, the backend, and the mongodb deployments, there are services for each, allowing the different pods to communicate to each other.

## Production Setup

All components of the system are ran with Kubernetes, within Pods. The frontend, backend, and database are each created through a Deployment, which creates a single Pod. Runners, which run the experiments, are created through Jobs, aimed to complete the task within a Pod and exit when finished. Jobs are created only when an experiment is submitted. This is done with the python-kubernetes client in the backend communicating with the kube-apiserver with an in-cluster config that allows it to interact with the cluster while inside the cluster.

## Secrets

Environmental variables and other encrypted information often need to be used within these pods. Since our system has a `.env` file, we need a way to prevent the production keys and information from being found. With Kubernetes, this is done through [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/), which holds encrypted data. You should treat secrets in a similar fashion to the `.env` file.

This is still unsafe to be published on a public server like Github, as it is only encrypted with base64. To work around this, we currently avoid storing the file on Github, saving it on our private Discord server instead. In the future, we may use [one-way encrypted secrets](https://github.com/bitnami-labs/sealed-secrets) to store our production server's secrets more easily, or, more likely, [a combination of Helm and Kustomize](https://trstringer.com/helm-kustomize/#option-2-helm-installupgrade) to be more flexible with other setups. A brief description of Helm is described further down, [skip ahead for more information](#helm).

## Storage

Since Pods are basically containers, the data they have are also contained within the Pod itself. However, when Pods get destroyed and recreated, that data gets destroyed as well, replaced with whatever the image contained. This is explained in greater detail in the [Kubernetes Volume documentation](https://kubernetes.io/docs/concepts/storage/volumes/).

To fix this, Kubernetes has [PersistentVolumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/), which stores data independent of a Pod. They work with PersistentVolumeClaims, which is a request for storage resources, like a disk or directory on a Node. Combined together, they allow the system to store and read data external to the Pods. This is used mainly for database data.

On the current production server, the data that mongodb interacts with is stored locally, with a [local volume](https://kubernetes.io/docs/concepts/storage/volumes/#local). However, more typical setups on the cloud usually use managed block storage on the cloud. Since this project is still small, local volumes work fine for now.

Maybe in the future, shifting to [Longhorn](https://longhorn.io/) or something similar for storage will be a good idea.

## Helm

!!! note

    The current system does not use Helm to package the Kubernetes setup. However, shifting towards Helm is likely going to happen in the future, for a more standard Kubernetes setup.

[Helm](https://helm.sh/) is a tool that packages entire Kubernetes applications. Just like how images are packages of a containerized application or program, Helm works with Charts, which package applications written to work using Kubernetes. This is a more standard way of installing applications onto a Kubernetes cluster, and many charts are stored on [Artifact Hub](https://artifacthub.io/).

To use helm, the project must be restructured to fit what it expected such that it can be packaged into a chart. [This video](https://www.youtube.com/watch?v=5_J7RWLLVeQ) may be a helpful resource, though there are other explanations online that may work better. The current development team has little experience with Helm, so as a result, this section is lacking in a full explanation.
