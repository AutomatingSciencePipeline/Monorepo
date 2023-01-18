#!/bin/bash
# Sets up the dev machine to have an overlay network for the containers to talk to each other with.

# https://docs.docker.com/network/overlay/#create-an-overlay-network

# Init this machine as the swarm manager -> it can't join a swarm
docker swarm init

# TODO we need to export what this returns somewhere for other things to connect to

# create overlay network called glados-overlay that non-swarm hosts are capable of joining
docker network create -d overlay glados-overlay --attachable

# TODO info on exiting the swarm via `docker swarm leave --force`
