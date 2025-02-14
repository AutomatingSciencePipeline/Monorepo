# Cluster update

This is a guide for updating the Kubernetes version of the cluster.

This document will be similar to the official [kubeadm upgrade guide](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/).

!!! Warning
    This could change based on kubeadm version! Compare with the guide at the top while updating!

First we are going to connect to the glados control node.

Now we need to change the Kubernetes repo version that we are using.

Run the following command.

```bash
sudo vim /etc/apt/sources.list.d/kubernetes.list
```

In my case, I see:

```bash
deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /
```

I am going to update from `v1.31` to `v1.32`, so I will change that here.

Press :wq to save this update to the file.

To avoid an error in the `sudo apt update`, we need to update the signing of the k8s repo:

```bash
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.32/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
```

Obviously replace `v1.32` with your version.

Next we run:

```bash
sudo apt update
sudo apt-cache madison kubeadm
```

This will update all of our package repos to make sure that we are going to download the right versions of everything.

Now we run the following commands:

```bash
# replace x in 1.32.x-* with the latest patch version
sudo apt-mark unhold kubeadm && \
sudo apt-get update && sudo apt-get install -y kubeadm='1.32.1-*' && \
sudo apt-mark hold kubeadm
```

This will update our kubeadm and then hold the version.

Let's verify:

```bash
kubeadm version
```

You should see something like:

```bash
kubeadm version: &version.Info{Major:"1", Minor:"32", GitVersion:"v1.32.1", GitCommit:"e9c9be4007d1664e68796af02b8978640d2c1b26", GitTreeState:"clean", BuildDate:"2025-01-15T14:39:14Z", GoVersion:"go1.23.4", Compiler:"gc", Platform:"linux/amd64"}
```

Now we can verify the upgrade plan:

```bash
sudo kubeadm upgrade plan
```

If all is well, then it is time to upgrade (this command is given in the terminal):

```bash
sudo kubeadm upgrade apply v1.32.1
```

Now we wait... that should eventually say:

```bash
[upgrade] SUCCESS! A control plane node of your cluster was upgraded to "v1.32.1".
```

Now we need to upgrade the nodes:

First connect to the worker node that needs upgrade.

Next upgrade kubeadm again:

```bash
# replace x in 1.32.x-* with the latest patch version
sudo apt-mark unhold kubeadm && \
sudo apt-get update && sudo apt-get install -y kubeadm='1.32.x-*' && \
sudo apt-mark hold kubeadm
```

Now run:
```bash
sudo kubeadm upgrade node
```

Now we need to drain the node from the control plane:

```bash
# execute this command on a control plane node
# replace <node-to-drain> with the name of your node you are draining
kubectl drain <node-to-drain> --ignore-daemonsets
```

Next:

```bash
# replace x in 1.32.x-* with the latest patch version
sudo apt-mark unhold kubelet kubectl && \
sudo apt-get update && sudo apt-get install -y kubelet='1.32.x-*' kubectl='1.32.x-*' && \
sudo apt-mark hold kubelet kubectl
```

Now restart the kublet:

```bash
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

Bring the node back:

```bash
# execute this command on a control plane node
# replace <node-to-uncordon> with the name of your node
kubectl uncordon <node-to-uncordon>
```

Repeat this for all of the worker nodes.

Congrats! The cluster is updated.

You can run ```kubectl get nodes``` and it will show the version of every node.