#!/bin/bash

echo 'Deploying helm package for MongoDB replica set!'

helm install glados-mongodb oci://registry-1.docker.io/bitnamicharts/mongodb -f ./mongodb-helm/values.yaml