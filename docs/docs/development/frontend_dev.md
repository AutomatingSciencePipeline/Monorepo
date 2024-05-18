# Front-end Developer Guide

## Structure of React Components
Monorepo > apps > frontend > pages : will be where most of the development will happen

Monorepo > apps > frontend > pages > api : is where all the api connections are made with MongoDB

dashboard.tx is the main page to see the list of experiments

Each experiment is created by the component `ExperimentListing.tsx`

## Warnings while Developing
### 1. Do not import modules on the top-level
![image](https://github.com/AutomatingSciencePipeline/Monorepo/assets/73076474/ea37da16-3d41-4e46-8960-6341de605956)
If you are trying to add a node module, double check this folder above and see if it is already included. If not, add the module in the front-end folder (by locating into the front-end directory then do npm ---(command)), not at the top-level. If we add it to the top level, it will take more time to load the webpage so be careful!

## Authentication
Authentication are stored in Firebase.

## Data Storage
As of 2023-24 GLADOS, all data is stored in MongoDB, except authentication/credentials.