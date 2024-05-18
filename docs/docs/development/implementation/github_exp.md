# Automating Github Repo Experiment
Updated on 12/11/2023

*Currently this implementation is in backlog, check the branch "automate-github-repo"

## Current Goal of Automating Github Experiment
* [Front-end] User enters github url on the website
* [Back-end] GLADOS checks if the github repo is cloneable
* [Back-end] GLADOS checks if the github has already been cloned
* [Back-end] If not, GLADOS creates a Docker image based on the cloned repo url
* [Front-end] User chooses which image to create the container
* Currently cannot spawn the container so will be cloning the repo inside our back-end container (?)

## Final Goal of Automating Github Experiment
(a.k.a. HAPPY PATH :))
(Assuming that distributed systems are working..)

* [Front-end] User enters github url on the website
* [Back-end] GLADOS checks if the github repo is cloneable
* [Back-end] GLADOS checks if the github has already been cloned (via MongoDB)
* [Back-end] If not, GLADOS creates a Docker image based on the cloned repo url
> Refer to this [link](https://docs.docker.com/engine/reference/commandline/build/#git-repositories)
* [Front-end] User chooses which image to create the container
* [Back-end] GLADOS creates a Docker container (and runs a sanity check if the experiment meets the requirements / running bash script)
* Currently cannot spawn the container so will be cloning the repo inside our back-end container
* [Back-end] GLADOS downloads dependencies and modules
* [Back-end] GLADOS creates config files with the config parser (currently not sure)
* [Back-end] GLADOS runs experiment


## Current Progress
* Currently we are using [evo-devo-nkfl-core](https://github.com/rhit-easy-lab/evo-devo-nkfl-core.git) as our sample github repository.
* [Front-end] Created a button `Github Experiment` modal to input and alerts for un-cloneable urls
* [Back-end] Trying to check if the github repo is cloneable by using subprocess in python
