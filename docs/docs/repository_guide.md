# This page is currently being migrated, and consists of old information

# Repository Guide

In order to keep the entire codebase in sync as it is developed,
we have opted to organize every service into a singular monorepo.

The top level repository folder does not contain any projects on its own
outside of various configuration files, convenience scripts, and GitHub actions.

<!-- As described in the [Development Containers section](#development-containers),
you can edit a service via its development container,
which will automatically take care of any required dependencies for you. -->

Next, we'll break down the role of each portion of the system,
what technologies it uses, and why it exists.

> This section is currently partly in the [Project Plan document](https://docs.google.com/document/d/1EcsoAmEUo8DS7LGOQmBP4Fj7Hs4RnHHUcwrb0x5Ec6g/edit#heading=h.7ni5k7zcz0fu), and will be expanded upon here later when the details are finalized.

TODO embed image of system diagram

## Github Projects Task Board

- New: Needs clarification with teammates and/or client
- Consult Jason: specifically awaiting info from or attention of client
- Backlog: Stuff we could do but don't plan to work on soon
- Ready: Stuff we could do and do plan to work on soon
- In Progress: Stuff we're actively working on (move it back to Ready if you aren't)
- In Review: Stuff we've finished but need to check it over next client meeting
- Done: Stuff we've finished and client has checked it over
- Eventually: Stretch goals and/or stuff that won't happen for a while

Tried it out over Trello because it would keep the information tied to our repo

Github Milestones system used to keep track of when tasks are supposed to be due, it kinda sucks because you can't say "I want it due this day" unless you have a milestone for that day. Access it from the Github issues page as a tiny button, or here <https://github.com/AutomatingSciencePipeline/Monorepo/milestones>

We are using a monorepo partly because Milestones are repo-specific

## GitHub Actions Continuous Integration

You can learn more about CI's relevance to our repo here: [Understanding GitHub CI](./GitHub-CI-Quick-Links).

This section explains each of the files in our repo's `/.github/workflows` folder and why they exist.

### node-test.yml

Success is required before PRs can be merged into main.

- Ensures there are no compile errors
- Runs ESLint (code style and bug early detection)
- Performs typescript type checking (bug early detection)
- Runs our unit tests

### python-test.yml

Success is required before PRs can be merged into main.

- Ensures there are no compile errors
- Runs pylint (code style and bug early detection)
- Runs our unit tests

### docker.yml

Success is required before PRs can be merged into main.

Ensures that the production docker images can be built successfully.

### stale.yml

Posts a comment and applies a label to our GitHub issues if we haven't modified them in a while.

## Repo Setup

TODO Talk about why the bash setup scripts exist and why devcontainers only half worked (the editor side needs ALL dependencies of every component installed for editor tooling to work)

Shellcheck linter for bash scripts

Check the gitattributes file for various settings and explanations of why they are that way

Github Wiki as a git sub module so it's easier to edit in editor and as you work (see the Contributing page "Local Copy of the Docs" section)

Markdownlint

VSCode with suggested extensions and workspace config as a middle ground

## Docker

TODO

We've been using windows host machines exclusively, it's important to note that windows/linux hosts have different capabilities on some levels, ex. I (Rob) don't think linux machines can run Windows container images, but not certain

Glados server is a linux host

## Frontend

### Typescript

Javascript but better

Type safety, can get kinda annoying, but catches a lot of mistakes at editor time rather than runtime

### Next.js

We're using it because the past team was.

Framework built on top of React

Offers a bunch of optimization stuff like server-side componenets that we aren't really using

### Node.js

Server-side javascript, the frontend web server is implemented using this

Required by Next.js

The version of Node.js installed by the dev install script is set in `variables.sh`

### Node Version Manager (and its windows variant)

Installs Node for you without conflicting with other installs on your machine.

Dev install script should handle it for you.

### Node Package Manager NPM

Installs node dependencies.

Unclear if using pnpm or yarn would have much of a performance benefit over npm because we already use Node Version Manager

#### Updating Project Node Dependencies

See the page [Updating Project Node Dependencies](https://github.com/AutomatingSciencePipeline/Monorepo/wiki/Updating-Project-Node-Dependencies) for more details.

### Mantine forms

This is currently behind a major versions, we should™ update it

### Tailwind CSS

We're using it because the past team was. Not super attached.

Sorta like boostrap where it has a bunch of css classes that are named based on what css properties they apply

### ESLint

## Backend

It currently serves as the only experiment runner

### Python (3.8, basic types support)

The version of Python installed by the dev install script is set in `variables.sh`

### Pyenv

We use `Pyenv` to install python on the host machine, the dev install script will handle it for you.

### Pipenv and dependencies

We're using `Pipenv` to manage our python virtual environment and package installs because:

- We don't always want builds of the containers include the latest versions of packages, or else [stuff like this happens](https://github.com/AutomatingSciencePipeline/Monorepo/issues/129).
- We have a package that only needs to be installed on Windows (see the Pipfile for more info)

We're using it instead of `pip freeze` because that approach would need multiple freeze files (normal, windows-specific, etc).

#### Updating Project Python Dependencies

TODO As described above, we're using `pipenv` to manage python dependencies. Usage info can be found [here](https://pipenv.pypa.io/en/latest/basics/#general-recommendations-version-control).

To install new python dependencies,
make sure you're in the backend app folder, then
use `pipenv install` instead of `pip install`.

To install new dev dependencies use the `--dev` flag, for example, `pipenv install --dev pytest` to add pytest

The lockfile should be updated automatically when you use `pipenv install`, but in case you need to make one manually, use `pipenv lock`.

If you encounter a merge conflict on Pipfile.lock, regenerate a new copy via `pipenv lock` (see [here](https://github.com/pypa/pipenv/issues/1389#issuecomment-423296700) and [here](https://dev.to/rrees/resolving-git-conflicts-in-pipenv-lockfiles-2g03))

### pylint (linter)

The config file for this is currently in repo root

### yapf (auto-formatter)

## Python Runner

TODO

Currently the backend serves this role

## Java Runner

TODO

Currently the backend serves this role

## Firebase

Ideally this will be removed from the system eventually because it is not open source

Free plan

Our client is a firebase console admin and can add/remove people on the project.

<https://console.firebase.google.com/u/0/project/gladosbase/overview>

Replaced self-hosted Supabase used by the past team.

In the interest of getting a running prototype, since deciphering the past team’s Supabase configuration was blocking meaningful progress elsewhere.

### Authentication

Not the end-goal solution for auth, but a great middle ground for now.

### Firestore Database

We are using the firestore 'subscribe to data' feature on the frontend

Can't keep everything in here because of storage + read/write usage costs

Some of the data here could be moved to MongoDB

### Firestore

In the process of being replaced with MongoDB

Holds experiment source code and experiment results/logs for download via the frontend

## MongoDB Experiment Data Storage

TODO @Brian

## Docker Swarm vs Kubernetes

TODO

Have to pick which distributed system platform will work best

We ran into issues with having both linux and windows host machines on docker swarm (which means we couldn't have both Glados Server and our own dev machines contributing computing power), unclear if kube will allow this or not

## GLADOS Server

Linux machine that is the docker host for the deployed system (nothing runs at system level, it's all inside docker)

Hosted in the rose CSSE department

See [Connecting to the GLADOS Server](./Connecting-To-Glados)
