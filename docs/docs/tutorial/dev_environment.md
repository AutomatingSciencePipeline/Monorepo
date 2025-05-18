# Development Environment

One of the major strides taken by the 24-25 Team was how developers were able to easily and effectively work on developing new features for GLADOS.

Multiple new technologies were used in an effort to make the process streamlined and allow developers to spend their time making meaningful changes instead of trying to make their development environments work. These technologies include the following:

## Rose-Hulman VM

To make development not intensive on an individual's laptop (because we know how a Rose laptop runs after 4 years), we decided to work with the CSSE department to set up another VM dedicated to GLADOS development where all development environments live, called **glados-forge**. To learn more about this VM, go to the [VMs](../infrastructure/vms.md) page.

## Tilt

Tilt is the technology that was found to enable live updating for a Kubernetes-based system. With this enabled, whenever a developer makes a change in any of the images (**frontend**, **backend**, or **runner**), it automatically updates the image and hot refreshes the page to show the change without any manual steps. This saves the process of rebuilding images and increases development speed greatly.

## VS Code + Dev Containers + SSH

VS Code has great integrations with Dev Containers and the ability to connect directly to the GLADOS image that has been spun up on the glados-forge server. All dependencies and extensions for development should also be installed.

## GitPod

GitPod is a technology that we added to GLADOS to make launching the development environment as simple as logging in with your RHIT GitHub and clicking the “Run” button. It has been configured to use the glados-forge server, the GLADOS repo, and VS Code to do all of the configuration and setup of the development environment.

---

## Usage

To use the development environment, do the following:

1. Go to [GitPod](https://gitpod.io/) and log in using your GitHub account used for development with GLADOS.

2. **[First Time Only]** The link provided should ask to join the GLADOS organization. Accept the invite.

3. On the main screen, there should be a **Create Environment** button. Click it to make a new environment.  

!!! note
    You only need to do this the first time, as you can reuse the environment after it was created the first time. Creating multiple environments will use up space on the VM and could cause problems in the future. Try to only maintain one environment unless there is a specific use case.

4. Wait for the UI on GitPod to update saying that the environment is running. This should take a few minutes.  
   To check if it is running, see if the top screen says **Running** and there are green checkmarks next to the Tasks below the status bar. If they do not show, check the [Troubleshooting](#troubleshooting) section.
5. Now click **Open in VS Code**. The environment should open in the editor and you are ready to develop for GLADOS!  
   See [Best Practices](../best_practices.md) for tips on how to utilize the system in the best way for development.

---

## Troubleshooting

### What if the Tasks don’t run?

GitPod may have an issue from time to time with successfully running all the tasks after setting up the environment. Stop and rerun the environment to see if the problem resolved. This should work 99% of the time.