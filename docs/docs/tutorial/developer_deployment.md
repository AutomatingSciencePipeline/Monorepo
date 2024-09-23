# Developer Deployment Detailed Descriptions

!!! note
    This is a living document as of September 2024. Updates will be provided as new approaches to development deployment are implemented for easier CI/CD practices for the dev team.

!!! Warning
    Make sure you use `sudo` for all commands that list it. Not doing so will result in the process to not be successful and deployment will not work as intended.

## Detailed Descriptions for Setup Machine

First, the script updates the dependencies and ensures that specific dependencies like apt-transport-https, ca-certificates, curl, and gnupg are installed.

```bash
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
```

Next, setup Kubernetes keyring. This only occurs if the keyring does not exist as it is required for the kubernetes to initialize. These commands are taken from the Kubernetes install page, found [here](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)

```bash
    sudo mkdir -p -m 755 /etc/apt/keyrings # -p option only make dir if it does not exist
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg # allow unprivileged APT programs to read this keyring

    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
    sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list   # helps tools such as command-not-found to work correctly
    sudo apt-get update
    sudo apt-get install -y kubelet kubeadm kubectl
    sudo apt-mark hold kubelet kubeadm kubectl
```

The script now installed containerd, the dependency to run the Dockers containers so that they can use system resources to run the containers for GLADOS.
These commands can be referenced from the [Docker Install](https://docs.docker.com/engine/install/ubuntu/) and the [containerd docs](https://containerd.io/).

```bash
    echo 'Adding docker install location'
    # Add Docker's official GPG key:
    sudo apt-get update
    sudo apt-get install ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update

    echo 'Installing containerd'
    sudo apt-get install containerd.io
```

Now, install the final two crucial dependencies, socat and pip. The installation will not complete if these dependencies are not present.

```bash
    echo 'Installing socat'
    sudo apt install socat

    echo 'Installing pip'
    sudo apt install python3-pip -y
    pip install kubernetes
    pip install python-dotenv
```

The setup for containerd is unique. The `sudo su` command tells the following commands to run as a super user until the following EOF is found. This is the only way that these commands will be run as running them normally will fail.

This command takes the default config and copies it to the directory in the command

```bash
    containerd config default > /etc/containerd/config.toml
```

This command replaces the SystemdCgroup from false to true in the default config file.

```bash
    sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
```

Finally, this command restarts containered to accept the changes

```bash
    sudo systemctl restart containerd
```

This section is important for setting up networking for the cluster to run. This makes the network configuration persistent across restarts.

The first command writes the standard input of `net.ipv4.ip_forward=1` into the `sysctl.conf` file.

```bash
    echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

The next command writes `net.bridge.bridge-nf-call-iptables=1` into the `sysctl.conf` file.

```bash
    echo "net.bridge.bridge-nf-call-iptables=1" | sudo tee -a /etc/sysctl.conf
```

The final command writes `br_netfilter` into the `modules` directory.

```bash
    echo "br_netfilter" | sudo tee -a /etc/modules
```

This loop runs the `sudo modprobe br_netfilter` command which will apply the module until the `sudo sysctl -p` command is successful.

```bash
    until sudo sysctl -p
    do
    sudo modprobe br_netfilter
    done
```

This section disables swap on the machine, which if not done will fail the setup and will not allow GLADOS to run.

!!! warning
    This step requires manual vim operations. Be sure to follow the echo instructions or else the kublet will fail.

```bash
    sudo swapoff -a

    echo "Use sudo vim /etc/fstab and comment out the swap line!!!! The kubelet will fail to launch if you do not do this!!!!!"
    echo "Use sudo vim /etc/fstab and comment out the swap line!!!! The kubelet will fail to launch if you do not do this!!!!!"
    echo "Use sudo vim /etc/fstab and comment out the swap line!!!! The kubelet will fail to launch if you do not do this!!!!!"
```

Finally, reboot the machine to ensure that the changes take place.

---

## Detailed Descriptions for Deploy Cluster

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

!!! warning
    This is not best practice but is currently how the cluster is setup. This will be removed in the future.

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

### 5. Initialize the Kubernetes Pods

This section of the script uses python to setup and start the pods (frontend, backend, and mongoDB) in Kubernetes cluster. This will loop every 5 seconds until all of the pods are created. Only then the `apply -f ipaddresspool.yaml` will execute and apply the ip address pool to all of the pods.

```bash
    python3 kubernetes_init/init.py
    echo 'Waiting for a pod to start....'
    sleep 5
    until kubectl apply -f ipaddresspool.yaml
    do 
    sleep 1
    echo 'Waiting for a pod to start....'
    done
```

### 6. Apply Advertisement and Expose

Finally, apply the advertisement to the pods and expose the frontend pod that was created to the network. All traffic comes into the control plane on port 80 and sends the traffic to port 3000 on the frontend.

```bash
    kubectl apply -f l2advertisement.yaml
    kubectl expose deployment deployment-test-frontend --type LoadBalancer --port 80 --target-port 3000
```