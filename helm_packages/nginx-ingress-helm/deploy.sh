#!/bin/bash

echo 'Deploying Helm package for NGINX Ingress Controller!'

helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx

# Wait a few seconds for the NGINX Ingress Controller to be ready
echo "Waiting for NGINX Ingress Controller to be ready..."
sleep 10

# Apply the Ingress resource configuration
kubectl apply -f glados-frontend-ingress.yaml

echo "NGINX Ingress Controller deployment initiated!"

echo "Make sure the tls secret is created in the default namespace!"