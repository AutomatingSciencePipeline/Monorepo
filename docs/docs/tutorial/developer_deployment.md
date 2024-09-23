# Developer Deployment

This guide contains the steps to deploy changes to the GLADOS frontend, backend, and mongoDB nodes to test changes made to the codebase.

!!! note
    This is a living document as of September 2024. Updates will be provided as new approaches to development deployment are implemented for easier CI/CD practices for the dev team.

!!! check
    This guide assumes that you have completed the [Developer Installation Guide](developer_installation.md) and have made changes to the codebase that need to be tested. Please review prior documentation if you are not at this point yet.

!!! Warning
    Make sure you use `sudo` for all commands that list it. Not doing so will result in the process to not be successful and deployment will not work as intended.

## Steps to Rebuild Images

---

### 1. Reset Kubernetes and remove the config file

First, run:

```bash
    sudo kubeadm reset
```

This resets the state of the Kubernetes node and cleans out and dependencies created by kubeadm.

Next, run:

```bash
    rm -f $HOME/.kube/config
```

This removes the existing config file from the directory.

---

### 2. Recreate the Kubernetes cluster

!!! note
    Make sure your terminal is pointed to the `Monorepo` directory before continuing.

Now, recreate the cluster by doing the init command:

```bash
    sudo kubeadm init --config kubeadm-config.yaml
```

Now, recreate the previously removed directory:

```bash
    mkdir -p $HOME/.kube
```

Use these commands to copy the admin configuration file to the newly created directory and change the ownership of the file to the current user:

```bash
    sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
    sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

!!!  Check
    At this point, running `kubectl get nodes` will check if there is now a created node. If there are no nodes listed, something has gone wrong and the process should be restarted.

### 3. Allow Replica Sets to Deploy on Control Plane Node

To ensure that the control plane is properly set up, the node needs to be tainted to allow pods to be deployed using this command:

```bash
    kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

### 4. Install Networking + Metallb

NOTE: Get info on this from Riley - not sure what this does w flannel

These commands enable the services for the networking of the Kubernetes cluster. Ensure these are run before continuing.

``` bash
    kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
    kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml
```

### 5. Initialize the Kubernetes Cluster

First, use this command to initialize the cluster.

```bash
python3 kubernetes_init/init.py
```

Next, use the following commands to apply the correct address pools and advertisements to the newly initialized cluster.

```bash
kubectl apply -f ipaddresspool.yaml

kubectl apply -f l2advertisement.yaml
```

### 6. Expose the Frontend of GLADOS

Use this command to expose the frontend image to your computers local host on port 3000.

```bash
kubectl expose deployment deployment-test-frontend --type LoadBalancer --port 80 --target-port 3000
```

To load the frontend, go to [localhost:3000](localhost:3000) in your browser.