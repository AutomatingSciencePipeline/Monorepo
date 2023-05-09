FROM python:3.8-slim AS base

ARG BACKEND_PORT
ENV BACKEND_PORT=$BACKEND_PORT

# Keeps Python from generating .pyc files in the container
# This doesn't benefit the performance of the system
# https://stackoverflow.com/questions/59732335/is-there-any-disadvantage-in-using-pythondontwritebytecode-in-docker
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        # For file type identification via bytes
        libmagic1 \
        #Ths should also get Java 11? -David
        default-jdk

# Ability to pass in JVM options
ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS

FROM base AS python_dependencies
# Copy in python requirements definitions, but don't install yet, dev and prod need different deps
RUN pip install pipenv
COPY Pipfile .
COPY Pipfile.lock .



# =====================================================================================================
FROM python_dependencies AS development
# Args explanation: https://stackoverflow.com/a/49705601
# https://pipenv-fork.readthedocs.io/en/latest/basics.html#pipenv-install
# and also https://stackoverflow.com/a/53101932
RUN pipenv install --system --deploy --ignore-pipfile --dev

WORKDIR /app
# The source code will be bind monuted in via docker compose, so we don't need to copy it in here

USER root
ENV FLASK_ENV development
ENV FLASK_DEBUG 1
CMD flask run --host=0.0.0.0 --no-debugger -p $BACKEND_PORT



# =====================================================================================================
FROM python_dependencies AS production
# Args explanation: https://stackoverflow.com/a/49705601
# https://pipenv-fork.readthedocs.io/en/latest/basics.html#pipenv-install
RUN pipenv install --system --deploy --ignore-pipfile

WORKDIR /app
COPY . /app

USER root
ENV FLASK_ENV production
CMD flask run --host=0.0.0.0 -p $BACKEND_PORT
