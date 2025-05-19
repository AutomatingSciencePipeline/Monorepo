# GLADOS Setup for Developers

We use VS Code dev containers for our developer environment because it greatly simplifies dependency setup.

There are 2 ways to deploy GLADOS that we will cover in this document:

1. Gitpod developer environment

2. Local developer environment via Docker

## Dev Technologies Used

### Rose-Hulman VM

To make development not intensive on an individual's laptop (because we know how a Rose laptop runs after 4 years), we decided to work with the CSSE department to set up another VM dedicated to GLADOS development where all development environments live, called **glados-forge**. To learn more about this VM, go to the [VMs](../infrastructure/vms.md) page.

### Tilt

Tilt is the technology that was found to enable live updating for a Kubernetes-based system. With this enabled, whenever a developer makes a change in any of the images (**frontend**, **backend**, or **runner**), it automatically updates the image and hot refreshes the page to show the change without any manual steps. This saves the process of rebuilding images and increases development speed greatly.

### VS Code + Dev Containers + SSH

VS Code has great integrations with Dev Containers and the ability to connect directly to the GLADOS image that has been spun up on the glados-forge server. All dependencies and extensions for development should also be installed.

## Using Gitpod

From Gitpod.io:

Gitpod is a zero-trust platform that provides automated and standardized development environments in your own infrastructure—whether on your local machine, in your cloud account (VPC), or on-prem. It streamlines coding workflows and boosts collaboration by letting teams spin up secure, preconfigured dev environments quickly and consistently.

So, what does that mean?

We install a program on our virtual machine (glados-forge) and that virtual machine can then spin up new virtual machines dispatched through a web GUI for developers to access.

#### How to use Gitpod

* Go to [Gitpod](app.gitpod.io) (after you have joined the organization)

* Click into the "Projects" tab

* You should see a project called GLADOS, hover over that and click "Create Environment"

!!! note
    You only need to do this the first time, as you can reuse the environment after it was created the first time by clicking the "play" button. Creating multiple environments will use up extra space on the glados-forge VM and could cause problems in the future. Try to only maintain one environment unless there is a specific use case.

* This will open a new environment for you based on the main branch.

##### If you are on Windows, you have to do the following

1. Press Windows key + R

2. Type .ssh and then click run

3. If a file named "config" exists open it, if not create one.

4. Put the following into that file (make sure to update with your Windows username):

```code
Include "C:/Users/{PUT YOUR USER HERE}/.ssh/code_gitpod_flex.d/config"
```

* Now you can click the the "Open VS Code" button

* After it loads you should be in the Monorepo folder on the dev environment

## Local Via Docker

### Prerequisites

* [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)

* [Setup Ubuntu in WSL2](https://documentation.ubuntu.com/wsl/en/stable/howto/install-ubuntu-wsl2/)

### How to setup

On Windows you have to run the dev container from WSL2 due to Windows not supporting the live updating in Tilt.

Skip step 2 if you are not using Windows!

1. Clone the [Monorepo](https://github.com/AutomatingSciencePipeline/Monorepo) to your machine

2. Run the start_in_wsl.py script

    ```bash
    python3 .devcontainer/start_in_wsl.py
    ```

3. Now you should have a VS Code window open to the Monorepo that has been copied to your WSL2 instance

4. In the bottom right of the VS Code window you should be prompted to open as a dev container, if not press F1 and search for "Rebuild", click "Rebuild and Reopen in Container"

5. You should then have the Monorepo open inside of a dev container

## Getting Started with the Monorepo

Now that you are inside of a dev container, we will go over how to get a running copy of GLADOS.

1. Copy the secret.yaml file into kubernetes_init/kubernetes_secrets

2. From the root of the Monorepo run the following command:

    ```bash
    tilt up
    ```

3. Now control + click on the URL that is shown: http://localhost:10350

4. You will see the Tilt interface, wait for the top to say 10/10, and then go to http://localhost:3000

Now you have a running version of GLADOS!

See [Best Practices](../tutorial/best_practices.md) for tips on how to utilize the system in the best way for development.

## Troubleshooting

### What if the Tasks don’t run?

GitPod may have an issue from time to time with successfully running all the tasks after setting up the environment. Stop and rerun the environment to see if the problem resolved. This should work 99% of the time.

### What is the ports are not working correctly?

Go to the Ports tab in VS Code and make sure that the ports are set to the correct ones. you can delete the port and re-add it to the correct port (e.g. 3000) fix the issue. If that does not work, try restarting the dev container.