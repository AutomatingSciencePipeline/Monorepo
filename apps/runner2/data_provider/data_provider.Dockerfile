# syntax=docker/dockerfile:1

FROM python:3.8 AS base

# Keeps Python from generating .pyc files in the container
# This doesn't benefit the performance of the system
# https://stackoverflow.com/questions/59732335/is-there-any-disadvantage-in-using-pythondontwritebytecode-in-docker
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        # For file type identification via bytes
        libmagic1

FROM base AS python_dependencies
# Copy in python requirements definitions, but don't install yet, dev and prod need different deps
RUN pip install pipenv
COPY Pipfile .
COPY Pipfile.lock .

RUN pipenv install --system --deploy --ignore-pipfile

WORKDIR /app
COPY . /app
COPY ../modules /app/modules
