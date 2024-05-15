# Overview

This section gives a general idea about how MongoDB is used in this project, and how to set up a REST API connection between frontend and backend.

## Usage

The database is accessible in both frontend and backend. In frontend, the database can be accessed by importing Mongo Client to the file that you are working on. The client promise is exported from mongodb.ts file in lib directory in the frontend. In backend, db directory in modules directory has a mongo.py file that has connection to the database and methods that communicates to the database.

## Frontend

In the frontend, the database cannot be directly accessed through the browser components due to the protocol difference between the browser and the database, and also due to the security concern. To access the database, you need to make a function call that uses the [fetch](https://nextjs.org/docs/app/api-reference/functions/fetch) method of Next.js, and this call could be made in the browser component or could be made as the method. The methods are collected in mongoFunc.ts file in MongoDB directory.

The fetch method requires an api url to be used. The API calls can be found in api directory in pages directory. The files made in the directory can import client promise and perform the needed CRUD methods. Also, to send information such as id, [dynamic route](https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes) can be used to send information along with the body in the fetch method. You can reference the other API call files to see how files are generally constructed.

## Backend

In the backend, the database can be accessed through mongo.py file in db directory in modules directory. The mongoClient is set up in the file by importing pymongo, and any necessary CRUD calls can be made within the file by making necessary methods. Those methods can be used in other files in the backend. You can refer to how other methods are set up in the file to see how each methods are constructed.

The frontend is connected to the backend with flaskApp. To do so, create an API file in api directory in the frontend and in the file, provide a url that connects to the backend with the backend port provided. experiment directory in api directory is a good example of how frontend and backend is connected. Given the port and the name of the receiving end specified in the url, the frontend and the backend can make connection with each other and send different files.

## Future Implementation

Currently, the real-time update feature is not implemented, but it needs to be implemented to complete the system. Please refer to how Firebase connection is retrieving and updates useEffect to set up the connection. [Change Stream](https://www.mongodb.com/docs/manual/changeStreams/) seems to be a good technology we can use to create connection. However, it requires the database set up to be a [replica set](https://www.mongodb.com/docs/manual/replication/) and also put together with Kubernetes. [This](https://www.mongodb.com/docs/kubernetes-operator/stable/tutorial/deploy-replica-set/) MongoDB official document seems to be a good reference to have. Once the set up is made, API calls need to be created to set up real-time update.
