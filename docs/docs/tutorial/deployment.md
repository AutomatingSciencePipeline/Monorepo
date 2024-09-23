# Deployment

This guide contains the steps to deploy changes to the GLADOS frontend, backend, and mongoDB nodes to test changes made to the codebase. It will setup the settings on a machine that has the Monorepo codebase and will complete all of the required prerequisite installation tasks.

!!! note
    This page is only how to use the setup scripts, if a detailed understanding of the scripts are needed for debugging, see the [Developer Deployment](developer_deployment.md) page.

## Setup VM

!!! warning
    Ensure that the terminal is directed to the outermost level of the Monorepo before running the following commands.

Before you can run the file, you need to make it executable. To do this, running the following command:

```bash
    chmod +x Setup_Machine.sh
```

The first script is to set up the settings machine to run the GLADOS deployment. Run this command, then follow the prompts.

```bash
    ./Setup_Machine.sh
```

!!! note
    Ensure to follow the echo command that is shown at the end of the script. Not doing so will result in the deployment to fail.

## Deploy Cluster

Before you can run the file, you need to make it executable. To do this, running the following command:

```bash
    chmod +x Deploy_Cluster.sh
```

The next script is to run the script that creates (or re-creates) the clusters and the images for the frontend, backend, and database. Run the following command:

```bash
    ./Deploy_Cluster.sh
```

Utilizing these two scripts should result in a new VM being created an