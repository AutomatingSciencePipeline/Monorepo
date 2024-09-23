#!/bin/bash

# This script is meant to be run on the server to update the code and restart the docker containers

# make sure networking is setup properly
# echo 'Configuring networking...'
# sudo su <<EOF
# sudo modprobe br_netfilter
# sudo echo 1 > /proc/sys/net/bridge/bridge-nf-call-iptables
# sudo echo 1 > /proc/sys/net/ipv4/ip_forward
# EOF

echo "Restarting cubed"
sudo kubeadm reset
rm -f $HOME/.kube/config

sudo kubeadm init --config kubeadm-config.yaml
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Allows replica sets to deploy pods on this node (remove once there are multiple nodes)
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# install networking + metallb
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.8/config/manifests/metallb-native.yaml

python3 kubernetes_init/init.py
echo 'Waiting for a pod to start....'
sleep 5
until kubectl apply -f ipaddresspool.yaml
do 
   sleep 1
   echo 'Waiting for a pod to start....'
done
kubectl apply -f l2advertisement.yaml
kubectl expose deployment deployment-test-frontend --type LoadBalancer --port 80 --target-port 3000