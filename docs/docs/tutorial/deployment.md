# Production Deployment

The deployment process for GLADOS has been made easy for any admin on the system.

!!! Note
    A change needs to be reviewed, approved, and merged into the `main` branch. Then, the GitHub Actions to build the new production images needs to be completed before a deployment can be performed.

There are two ways to do a production deployment:

1. **On the Frontend**
2. **SSH through the glados.csse.rose-hulman.edu Server**

---

## On the Frontend

This method is the primary method of deploying new changes to GLADOS and will work 99% of the time.

To complete this method:

1. Ensure that the user on GLADOS is an Admin.
2. Go to the Admin dashboard and select the appropriate deployment section.
3. There will be a red **Redeploy** button. Clicking this button will redeploy the application images and may take up to a couple of minutes.
4. Refreshing the page or opening it in a new tab will show when the application is back up and running.

---

## Through the Server

This is the backup method of completing a redeployment for GLADOS. It should only be used when the frontend redeployment button is not working properly.

To complete a redeployment this way:

1. Connect to the main GLADOS server by using the main account found in the Dev Team shared files.
2. Use SSH to log in to the server.
3. From the main page of the server CLI, run:

   ```sh
   ./Deploy-Server
   ```

This will deploy the newly created images in the same fashion as the frontend button. Refreshing the page will show when the changes are live.