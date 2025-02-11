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
# create the cluster
ctlptl create cluster minikube --registry=ctlptl-registry

# Install some pip packages
pip install flask-cors
pip install kubernetes
pip install pymongo
pip install bson
pip install pyyaml
pip install gunicorn
pip install numpy
pip install configparser
pip install python-magic
pip install python-dotenv
pip install matplotlib
pip install pydantic
pip install pipreqs