#!/bin/bash

# This script is meant to be run on the server to update the code and restart the docker containers
# It is not intended to be run on developer machines.

echo "Stopping containers..."

if ! docker container stop glados-frontend glados-backend glados-mongodb; then
    echo "Failed to stop docker containers?"
    exit 1
fi

if ! test -e ".env"; then
    echo "You don't seem to have a .env file - follow the directions here to get one: https://github.com/AutomatingSciencePipeline/Monorepo/wiki/User-Guide#get-the-env-files"
    exit 1
fi

echo "Pulling new code..."
if ! git pull; then
    echo "Failed to pull updated code?"
    exit 1
fi

echo "Rebuilding and starting containers..."
if ! sudo docker compose up --build -d; then
    echo "Failed to start up docker containers?"
    exit 1
fi

docker ps -a

echo "Ensure that the docker containers listed all report that they are 'up' and that there aren't any unexpected errors."
echo "Reminder: Make sure that you have updated the system's .env file if new entries have been added since the last deploy!"
