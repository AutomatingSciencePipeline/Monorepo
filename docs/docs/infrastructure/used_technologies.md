# Used Technologies

These are the technologies used currently when using GLADOS locally.

## Auth.js

Auth.js is the library that is used for authentication on GLADOS.

OAuth authentication is the Auth.js type used on GLADOS. The Next.js version is used, since Next.js is already being used in the frontend.

Thanks to OAuth, GLADOS users can log into the website by using their GitHub account.

Learn more about Auth.js on their [website](https://authjs.dev/getting-started).

## MongoDB

The database GLADOS uses is MongoDB. Modifying the GLADOS database itself can be done by using MongoDBCompass.

Learn more about MongoDB on their [website](https://www.mongodb.com/docs/). 

Learn more about MongoDBCompass [here](https://www.mongodb.com/docs/compass/current/).

## Tilt

Tilt is a local development tool for Kubernetes. Its purpose in GLADOS is to allow for developers to test their changes on a local version of GLADOS, as testing local changes with Kubernetes is difficult thanks to how it operates.

Tilt allows for **live updating** for the local version of GLADOS; so if a developer makes a change in their code, Tilt will automatically update the local GLADOS website to reflect that. This is particularly useful when making changes on the frontend, helping speed up the process of local development drastically.

Learn more about Tilt on their [website](https://tilt.dev/).

## VSCode Dev Containers

Visual Studio Code has an extension called 'dev_containers', which allows for developer containers to be run in VSCode specifically. By using this extension, developers of GLADOS can let VSCode do most of the Docker work for them. This is the vehicle for developing locally with GLADOS in an effective way.

Learn more about VSCode Dev Containers [here](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).