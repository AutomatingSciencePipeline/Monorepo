# syntax=docker/dockerfile:1
FROM python:3.8-slim AS base

# RUN apt-get update && \
#     apt-get install -y ca-certificates curl gnupg && \
#     install -m 0755 -d /etc/apt/keyrings && \
#     curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
#     chmod a+r /etc/apt/keyrings/docker.gpg

WORKDIR /app
COPY . /app

FROM base AS python_dependencies
RUN pip install pipenv
COPY Pipfile .
COPY Pipfile.lock .

# =====================================================================================================
FROM python_dependencies AS production
# Args explanation: https://stackoverflow.com/a/49705601
# https://pipenv-fork.readthedocs.io/en/latest/basics.html#pipenv-install
RUN pipenv install --system --deploy --ignore-pipfile

WORKDIR /app
COPY . /app

USER root
ENV FLASK_ENV production
EXPOSE $BACKEND_PORT
CMD flask run --host=0.0.0.0 -p $BACKEND_PORT