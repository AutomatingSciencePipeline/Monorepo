#!/bin/zsh
cd /workspaces/Monorepo/apps/frontend || echo 'folder not found!'
npm i
 
minikube config set cpus 3
minikube config set memory 12000
minikube delete

# wait for docker daemon to start
while ! docker info &> /dev/null; do
    sleep 1
done
timeout 120s ctlptl create cluster minikube --registry=ctlptl-registry 
minikube delete
# try the ctlptl command again
ctlptl create cluster minikube --registry=ctlptl-registry