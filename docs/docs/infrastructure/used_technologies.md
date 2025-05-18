# Used Technologies

These are the technologies used currently when using GLADOS locally.

This document will be similar to the official [kubeadm upgrade guide](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/).

## Auth.js

Auth.js is the library that is used for authentication on GLADOS.

OAuth authentication is the Auth.js type used on GLADOS, as it is what allows for users to log in using GitHub currently.

Learn more about Auth.js on their [website](https://authjs.dev/getting-started).

## Tilt

Tilt is a local development tool for Kubernetes. Its purpose in GLADOS is to allow for developers to test their changes on a local version of GLADOS, as testing local changes with Kubernetes is difficult thanks to how it operates.

Tilt allows for **live updating** for the local version of GLADOS; so if a developer makes a change in their code, Tilt will automatically update the local GLADOS website to reflect that. This is particularly useful when making changes on the frontend, helping speed up the process of local development drastically.

Learn more about Tilt on their [website](https://tilt.dev/).