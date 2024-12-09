#!/bin/bash

echo 'Deploying helm package for MongoDB replica set!'

kubectl apply -f pvs.yaml

helm install glados-mongodb oci://registry-1.docker.io/bitnamicharts/mongodb -f values.yaml