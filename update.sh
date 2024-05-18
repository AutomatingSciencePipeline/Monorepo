#!/usr/bin/env bash

docker image build -t sugiyat/image-test-backend:latest ./apps/backend
docker push sugiyat/image-test-backend:latest

docker image build -t sugiyat/image-test-runner:latest ./apps/runner
docker push sugiyat/image-test-runner:latest