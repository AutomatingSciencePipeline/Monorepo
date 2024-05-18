#!/bin/bash

# This script is meant to be run on the server to update the code and restart the docker containers
# It is not intended to be run on developer machines.

echo "Restarting kubeadm"
kubeadm reset --cri-socket unix:///var/run/crio/crio.sock
rm -f $HOME/.kube/config

kubeadm init --config kubeadm-config.yaml
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Allows replica sets to deploy pods on this node (remove once there are multiple nodes)
sudo -u $SUDO_USER kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# install networking + metallb
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml

python3 ./kubernetes-init/init.py
kubectl apply -f ipaddresspool.yaml
kubectl apply -f l2advertisement.yaml
kubectl expose deployment deployment-test-frontend --type LoadBalancer --port 80 --target-port 3000