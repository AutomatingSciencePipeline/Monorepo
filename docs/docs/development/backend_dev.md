# Back-end Developer Guide

## Quick Summary of Docker Containers vs Images

### Docker Image
* An image is a lightweight, standalone, and executable package that includes everything needed to run a piece of software, including the code, runtime, libraries, and system tools.
* It is a static snapshot of a file system, and it is built from a set of instructions called a Dockerfile.
* Images are used as a template to create containers.

### Docker Container
* A container is a running instance of a Docker image.
* It encapsulates an application and its dependencies, isolating it from the host system and other containers.
* Containers are portable and can run consistently across different environments, thanks to the encapsulated nature of Docker images.

### Key Differences between Images and Containers

#### Stateless vs. Stateful

* Images are stateless and immutable. Once built, they don't change.
* Containers are a running, writable instance of an image. They are stateful, as they can have data and configurations that change during runtime.

#### Build vs. Runtime

* Images are built-time constructs. You create or update them by writing a Dockerfile and running the docker build command.
* Containers are runtime entities. They are created from images and run using the docker run command.

#### Purpose

* Images are used for distribution and deployment. They serve as a blueprint for creating containers.
* Containers are the execution environment for a specific application and its dependencies.

### Container Repositories

Like Github repositories, Docker also has a repository but we do not upload images to the repository when we are developing.

## Working on GLADOS

### Docker Containers and Images
There are four docker containers (glados-backend, glados-frontend, glados-mongodb, glados-DEVONLY-mongodb-express) and four docker images (glados-project-app-backend, glados-project-app-frontend, mongo, mongo-express).

### DockerFile
Once you make changes to your DockerFile (which is backend.Dockerfile), you need to rebuild the docker image.

Locate `MonoRepo/apps/backend` and execute this command:

`docker build -t glados-project-app-backend:latest -f backend.Dockerfile .`

Check if the images are up to date:
`docker images`

If you created a wrong image, if you want to remove an image:
`docker image rm (id of the image)`

### Accessing Docker Container
There are three ways to access the running docker container:

Let's say if you want to access glados-backend container, then we can execute one of the three commands below: 

`docker exec -it glados-backend //bin/bash`

`docker exec -it glados-backend sh`

`docker exec -it glados-backend //bin/sh`
