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
        # For file type identification via bytes : might be fake
        libmagic1 \
        #Ths should also get Java 11? -David
        default-jdk 
        
# Ability to pass in JVM options
ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS

FROM base AS python_dependencies
# # Copy in python requirements definitions, but don't install yet, dev and prod need different deps
RUN pip install pipenv
COPY ./data_provider/Pipfile .
COPY ./data_provider/Pipfile.lock .

RUN pipenv install --system --deploy --ignore-pipfile

# # for bson, else code breaks
# RUN pip install \
# pymongo \
# pydantic==1.10.7 \ 
# requests \
# dotenv \
# # might be the real magic
# python-magic \
# numpy \
# matplotlib 

WORKDIR /app
COPY runner/ /app/
COPY modules/ /app/modules/ 
COPY runner/runner.py /app/runner.py