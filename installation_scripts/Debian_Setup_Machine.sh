#!/bin/bash

sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg

sudo mkdir -p -m 755 /etc/apt/keyrings # -p option only make dir if it does not exist
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg # allow unprivileged APT programs to read this keyring

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list   # helps tools such as command-not-found to work correctly
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

echo 'Adding docker install location'
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

echo 'Installing containerd'
sudo apt-get install containerd.io

echo 'Installing socat'
sudo apt install socat

echo 'Installing pip'
sudo apt install python3-pip -y
pipx install kubernetes --include-deps
pipx install python-dotenv --include-deps
pipx install yaml

echo 'Setting up containerd'
sudo su <<EOF
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
sudo systemctl restart containerd
EOF

echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-iptables=1" | sudo tee -a /etc/sysctl.conf
echo "br_netfilter" | sudo tee -a /etc/modules
until sudo sysctl -p
do
  sudo modprobe br_netfilter
done


# disable swap
sudo swapoff -a

echo "Use sudo vim /etc/fstab and comment out the swap line!!!! The kubelet will fail to launch if you do not do this!!!!!"
echo "Use sudo vim /etc/fstab and comment out the swap line!!!! The kubelet will fail to launch if you do not do this!!!!!"
echo "Use sudo vim /etc/fstab and comment out the swap line!!!! The kubelet will fail to launch if you do not do this!!!!!"

echo 

echo "After you have done this, reboot"
