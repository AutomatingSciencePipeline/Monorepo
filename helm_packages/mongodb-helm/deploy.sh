#!/bin/bash

echo 'Deploying Helm package for MongoDB replica set!'

# Apply Kubernetes Persistent Volumes configuration
kubectl apply -f pvs.yaml

# Define an array of directories
DIRS=(
  "/srv/data/mongo-1"
  "/srv/data/mongo-2"
)

# Check if "--create" is provided before creating directories
if [[ "$1" == "--create" ]]; then
  echo "Creating necessary directories..."
  for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
      sudo mkdir -p "$dir"
      sudo chown 1001:1001 "$dir"
      echo "Created and set ownership for $dir"
    else
      echo "$dir already exists"
    fi
  done
else
  echo "Skipping directory creation. Pass --create to ensure directories exist."
fi

# Deploy MongoDB using Helm
helm install glados-mongodb oci://registry-1.docker.io/bitnamicharts/mongodb -f values.yaml

echo "MongoDB deployment initiated!"
