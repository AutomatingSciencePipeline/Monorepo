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

# The MongoDB credentials live in a Kubernetes Secret, not in values.yaml
AUTH_SECRET_NAME="glados-mongodb-auth"
if kubectl get secret "$AUTH_SECRET_NAME" >/dev/null 2>&1; then
  echo "Using existing secret $AUTH_SECRET_NAME"
else
  if [ -z "$MONGODB_ROOT_PASSWORD" ]; then
    echo "Enter the MongoDB root password. It must match MONGODB_PASSWORD in the secret-env secret."
    read -r -s -p "Password: " MONGODB_ROOT_PASSWORD
    echo
  fi
  if [ -z "$MONGODB_ROOT_PASSWORD" ]; then
    echo "No password given, aborting."
    exit 1
  fi
  kubectl create secret generic "$AUTH_SECRET_NAME" \
    --from-literal=mongodb-root-password="$MONGODB_ROOT_PASSWORD" \
    --from-literal=mongodb-replica-set-key="$(openssl rand -hex 32)"
  echo "Created secret $AUTH_SECRET_NAME"
fi

# Deploy MongoDB using Helm
helm install glados-mongodb oci://registry-1.docker.io/bitnamicharts/mongodb -f values.yaml

echo "MongoDB deployment initiated!"
