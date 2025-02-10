#!/bin/bash
cd /workspaces/Monorepo/apps/frontend || echo 'folder not found!'
npm i
 
minikube config set cpus 3
minikube config set memory 12000
minikube delete

# wait for docker daemon to start
while ! docker info &> /dev/null; do
    sleep 1
done
# try the ctlptl command again
ctlptl create cluster minikube --registry=ctlptl-registry