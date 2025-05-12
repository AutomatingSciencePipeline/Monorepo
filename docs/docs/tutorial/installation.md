# Installation

## Overview

This section covers how to, as a user of the Automating Science Project system, run a simulation of the system on your local machine.

If you don't want to run your own copy, you can instead access the live website [here](http://glados-lb.csse.rose-hulman.edu/) and jump straight to [Running an Experiment](usage.md).

!!! warning

    As of March 2024, we have shifted towards running the system on Kubernetes, rather than Docker. These steps still work with the current codebase, but as we fully migrate the codebase to our Kubernetes version, these steps will need to be updated accordingly.

!!! note

    These steps mainly concern hosting a local system on a Windows computer. Steps on other OS's will have the same steps, although the specific steps on installation, as well as configuration, may differ.

## Required Tools

### Git

Git is a code version management tool that integrates with Github, where our codebase is stored.

If you don't already have it installed, you can download it on the [git website](https://git-scm.com/downloads).

### Docker

Docker is a utility that manages small virtual machine "containers."

To install it, follow the instructions on [Docker's documentation](https://docs.docker.com/get-docker/).

You might encounter a permissions error on Windows
mentioning not being part of the docker-users group.
Directions to fix that can be found [here](https://icij.gitbook.io/datashare/faq-errors/you-are-not-allowed-to-use-docker-you-must-be-in-the-docker-users-group-.-what-should-i-do).

#### WSL Error

To get Docker to work properly, you will need to install WSL.
This may fail for Windows. In this case, check that virtualization is enabled in the BIOS.

## Retrieve the Code

In a location of your choice in a drive with at least 1 GB of free space,
use Git to clone the repo.

Your command will probably look like this:

```bash
git clone --recurse-submodules https://github.com/AutomatingSciencePipeline/Monorepo.git
```

Or this if you have [ssh keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) set up (Recommended):

```bash
git clone --recurse-submodules git@github.com:AutomatingSciencePipeline/Monorepo.git
```

The `--recurse-submodules` can be omitted if you don't want to download a copy of the docs as well.

If cloning isn't working for some reason,
you can download a zip from [here](https://github.com/AutomatingSciencePipeline/Monorepo/archive/refs/heads/main.zip) instead.
Note that, if you download a zip, Windows or antivirus programs may block you from running the code,
in which case you will have to navigate various security dialogs to unblock it.
It may also not have the correct line endings (CRLF vs LF) for your system.

## Get the .env file(s)

The system keeps track of private keys (strings that act as passwords to various services) in a `.env` file.
For security reasons, these cannot be publicly distributed with the rest of the code.

You can get a copy of our `.env` file from our private Discord in the [#env-files channel](https://discord.com/channels/1017208818989539368/1042935101601873970). Note that you must already be a member of the Discord to open this link; contact us if you need access.

The file should be named exactly `.env` and placed in the root folder of the repository.

#### Alternative: Set up your own .env file

You can create your own `.env` file, if you want to set up your own GLADOS system. There is an `.example.env` file in the repository that has sample fields to fill in. During this process, you will need to set up a Firebase project for account management. Note that the frontend code has the Firebase public key in it, which does not need to be secure, but will need to be replaced when hosting your own GLADOS system.

## Run the System Locally

Once you have the above taken care of, you can use Docker to spin up a copy of the system.

1. Open a terminal in Monorepo root folder (`Monorepo/`)
2. Run `docker compose up --build`
   - This will start up the Docker Compose for the **production version** of the project, which will locally host a backend, frontend, and database for you. With the included `.env` file, it will point to the production Firebase project for authentication.
   - Optionally use the flag `-d` to detach it from the terminal window, which means Docker will keep running even when the terminal is closed.
   - If you see an error message like `open //./pipe/docker_engine: The system cannot find the file specified` you probably don't have Docker started.
   - The `--build` flag indicates it should build the containers from scratch. You can exclude this flag from future runs, but you should build again after pulling new code from the repo.
   - If this succeeds, the last message in the console should be similar to: `glados-backend  | Press CTRL+C to quit`
   - If this fails, see the troubleshooting steps below
3. Go to <http://localhost:3000> (or another address, if the command output reports a different url) in your browser
   - Because you're running the production version, pages should load nearly instantly. The developer version might take a bit to load.
4. Once on the site, sign up for an account or log in.

Now you are ready to run an experiment.

## Next Steps
See how to [run an experiment](usage.md).
