#!/bin/bash

# This script is meant to be run on the server to update the code and restart the docker containers

echo "Restarting cubed"
sudo kubeadm reset --cri-socket unix:///var/run/containerd/containerd.sock
rm -f $HOME/.kube/config

sudo kubeadm init --config ../kube_config/kubeadm-config.yaml
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# UNCOMMENT IF ONLY USING 1 NODE
# kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# install networking + metallb
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.8/config/manifests/metallb-native.yaml

cd ..
python3 ./kubernetes_init/init.py
cd installation_scripts || exit
echo 'Waiting for a pod to start....'
sleep 5
until kubectl apply -f ../kube_config/ipaddresspool.yaml
do 
   sleep 1
   echo 'Waiting for a pod to start....'
done
kubectl apply -f ../kube_config/l2advertisement.yaml