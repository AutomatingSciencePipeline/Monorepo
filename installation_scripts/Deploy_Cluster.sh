#!/bin/bash

# This script is only to be run when the cluster is setup for the first time!

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
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml

# Run the helm deploy scripts
cd ../helm_packages/nginx-ingress-helm || exit
./deploy.sh
cd ../mongodb-helm || exit
./deploy.sh --create

# Get back to the root directory
cd ../..
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