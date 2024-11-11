#!/bin/bash

echo 'Setting up nfs-server!'

kubectl apply -f nfs-server-pv.yaml
kubectl apply -f nfs-server.yaml
kubectl apply -f nfs-service.yaml

helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=nfs-service.default.svc.cluster.local \
  --set nfs.path=/exports
