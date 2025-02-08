#!/bin/bash
cd ./apps/frontend || echo 'folder not found!'
npm i

minikube config set cpus 3
minikube config set memory 12000

ctlptl create cluster minikube --registry=ctlptl-registry