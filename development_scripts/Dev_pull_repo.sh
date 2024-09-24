#!/bin/bash

# This script will pull the most recent version of the development branch and update a couple of file to prepare them for debugging

git clone https://github.com/AutomatingSciencePipeline/Monorepo.git

echo 'You will need to copy in .env and kubernetes_secrets file!'

cd Monorepo || exit

git checkout development

git pull origin development

sed -i 's/glados-backend:latest/glados-backend:development/g' ./kubernetes_init/backend/deployment-backend.yaml
sed -i 's/glados-frontend:latest/glados-frontend:development/g' ./kubernetes_init/frontend/deployment-frontend.yaml
