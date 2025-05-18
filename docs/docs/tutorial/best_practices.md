# Best Practices

This page will give a brief overview of the best practices for using GLADOS. For more detailed information on the sections, see the attached links to the relevant areas of the documentation or system technology documentation.

## Repository Structure

The GLADOS repository is structured to allow for easy navigation and understanding of the system. The main components of the repository are:

### Code Structure

- **Backend**: The backend code is located in the `apps/backend` directory. This contains all the code for the backend APIs. Since GLADOS is mainly a kubernetes structure with a NextJS frontend, the backend code is mainly for the API calls to start/cancel experiments and the database calls to get the data for the frontend. The backend code is written in Python.

- **Frontend**: The frontend code is located in the `apps/frontend` directory. This contains all the code for the web application, including the React components and styles. The frontend code is written in TypeScript and uses Next.js for server-side rendering and routing. Most of the mongoDB and Kubernetes API calls are handled in the server-side code of the Next.js application, found in `lib/mongo_funcs.ts` and `lib/k8s_funcs.ts`.

- **Runner**: The runner code is located in the `apps/runner` directory. This is the code that the kubernetes cluster creates for a experiment. It handles the parameter parsing, experiment running, and result collection. The runner code is written in Python.

- **Documentation**: The documentation for GLADOS is located in the `docs` directory. This contains all the documentation for the system, including the user guide, developer guide, and API documentation. The documentation is written in Markdown and is generated using MkDocs.

### Branching Strategy

The GLADOS repository uses a branching strategy to manage the development process. The main branches are:

- **main**: This is the main branch of the repository. All changes to the code should be made in a separate branch and then merged into the main branch after review. At least one other developer should review the code before it is merged into the main branch. The main branch is protected and cannot be directly pushed to.

- **dev**: This is the development branch of the repository. All new features and changes should be made in a separate branch off of the dev branch. The dev branch is not protected and can be pushed to directly. This is a space to test the changes on a kubernetes cluster that has one node before being merged into the main branch. The dev branch is used for testing and development purposes only.

- **feature branches**: These are the branches that are created for new features or changes. The current dev team should come up with a naming convention for the feature branches. This is where the new features and changes are developed and locally tested using the live updating functionalities of Tilt and the dev containers on glados-forge.

## Dev Environment

The development environment for GLADOS is streamlined using the glados-forge VM, Gitpod, and Dev Containers. See the [Development Environment](../tutorial/dev_environment.md) page for more information on how to set up your development environment. For more information on glados-forge, see the [VMs](../infrastructure/vms.md) page.

## Task Board

The task board for GLADOS is located in the [GitHub Projects](https://github.com/orgs/AutomatingSciencePipeline/projects/1/views/1). This is where all of the tasks/issues for GLADOS are tracked and managed. The current dev team should create a standard for how to name and track time for the tasks/issues that they are working on. In the past, the naming convention has been to use the following format: '[Task Name] - _/[Number of Hours Predicted]'. This way the person who is assigned to the task can update the time as they are working. 

GitHub has also implemented a sub-task feature that allows for the creation and management of smaller tasks that can combine into a larger feature. This is a great way to  both split up work on a large feature between people and better track the time that each part of the feature is taking. 

Another important feature of the task board is the ability to assign labels for importance of the task and assign the development branch that is being used to complete the work for that task. Utilizing these task board management features will help the team stay organized and on track with the development of GLADOS.

## Code Reviews

All code changes should be reviewed by at least one other developer before being merged into the main branch. This is to ensure that the code is of high quality and meets the standards of the project. The code review process should include:

- A review of the code for readability and maintainability. (No unnecessary comments, clear variable names, etc.)
- A review of the code for correctness and functionality. (Do not push failing code to the main branch.)
- A review of the code for performance and efficiency. (Do not push code that is slow or inefficient to the main branch.)
- A review of the code for security and safety. (Do not push code that is insecure or unsafe to the main branch.)

If anything needs to be changed, comment on the pull request and request changes. Once the changes have been made, approve the pull request and merge it into the main branch. If you are not sure about a change, ask for help from another developer or the project lead.

!!! note
    As of Spring 2025, GitHub has added GitHub Copilot to the code review process. This is a great way to get suggestions for code changes and improvements. However, it is important to remember that this is just a suggestion and should not be used as a replacement for a human code review.