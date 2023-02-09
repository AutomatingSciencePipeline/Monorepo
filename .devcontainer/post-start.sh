#!/bin/bash

# Silence warnings about the git repos not being owned by this user (since it's bind mounted from host)
# This runs inside the container, so it's okay to do global git config
git config --global --add safe.directory "/workspaces/Monorepo"
git config --global --add safe.directory "/workspaces/Monorepo/Monorepo.wiki"
echo Added workspace folder to git safe directories
