# GLADOS: The Open Science Project

GLADOS is an open sourced student-driven project geared towards building a high-performance modular computational pipeline for running big data experiments in a parallel fashion.

## User Guide
### Docker installation

In order to install docker, follow the link provided to the docker documents.

Windows: https://docs.docker.com/desktop/windows/install/ 

Mac: https://docs.docker.com/desktop/mac/install/

Warning:

Docker may have an error when running where the message is along the lines of “You cannot run docker because you are not a part of the docker-users group.” To add yourself to the group, follow this link: https://icij.gitbook.io/datashare/faq-errors/you-are-not-allowed-to-use-docker-you-must-be-in-the-docker-users-group-.-what-should-i-do  

### Retrieving and Running the Code 

After Docker and GitHub are set up, open a new terminal a desired directory of choice. Follow the instructions to install and clone the repo

After navigating to the desired directory type in `git clone` [Monorepo URL]

You can find the URL to copy in by navigating to the green code button. In the figure below, it is circled in red. 

![Figure 1](blob:https://glados.atlassian.net/6439333a-bf15-49fd-91e1-b98bed29d6ec#media-blob-url=true&id=070379f5-93c9-4d04-a938-3aad00e4e5ab&collection=contentId-32145409&contextId=32145409&mimeType=image%2Fpng&name=image-20220402-145710.png&size=45004&height=371&width=571&alt=)

3. Copy paste the URL in the text as shown below. 

![Figure 2](blob:https://glados.atlassian.net/77e4c26e-9470-4f50-98bb-52f482d0db3a#media-blob-url=true&id=12d144c0-bb93-4cf6-80a3-174e64765de9&collection=contentId-32145409&contextId=32145409&mimeType=image%2Fpng&name=image-20220402-145823.png&size=19290&width=398&height=201&alt=)

4. Afterward you should see the final command: 

![Figure 3](Dragster.jpg)

5. Next, hit enter and the installation should take less than a minute. 

6. The below figure demonstrates what the repo should look like when cloning. 

![Figure 4](Dragster.jpg)



7. Successful cloning should display the following output in the terminal. 

![Figure 5](Dragster.jpg)

### Running the Code:

To run the code you need to first navigate to the Monorepo/services/supabase directory. The directory should look like this: 

![Figure 6](Dragster.jpg)

2.  Type in `docker-compose up --build` (Note: can also use the flag -d to detach the containers, allowing you to do other things in terminal. To close docker like this, use the command `docker-compose -down`

3. When running you will get a bunch of messages popping up. However, the most important thing is at the end you should receive this message circled in green: 

![Figure 7](Dragster.jpg)

Just to note, if you run Glados for the first time creating the image will take a couple of minutes or more. After that, it should pretty quickly. 

Additionally, make sure that you have docker running before you run the previous command. Otherwise, you might get this message: 

![Figure 8](Dragster.jpg)


4. To log into Glados enter in `localhost:5005`. The application should run through port 5005. The start page will look like: 

![Figure 9](Dragster.jpg)

Creating a User: 

To create a user select the “Create Account” button as shown below. 

![Figure 10](Dragster.jpg)

Next, when you press that button a pop up should appear and look like this: 

![Figure 11](Dragster.jpg)

3. Make sure to enter in an email with more than six characters and a valid password. If you meet none of these criteria, a warning message will pop up. It will look like this: 
 
![Figure 12](Dragster.jpg)

4. After the proper information is created, you will be redirected to the user page. It should look like this. 

![Figure 13](Dragster.jpg)


### Logging into System 

After seeing the home page, enter in your user name and password. press the Login button as circled in the below image. 

![Figure 14](Dragster.jpg)

2. After pressing the button, you should see a blank experiment page. The next subsection Running and Experiment goes into more detail. However, if you input the wrong password. You will get an alert like this: 

![Figure 15](Dragster.jpg)



### Running An Experiment: 

If you want to watch a video on running an experiment instead of reading it, here is the link: https://youtu.be/XGiNnODBTPE  (https://youtu.be/XGiNnODBTPE) . 

After you are logged in, you should reach this home page: 

![Figure 16](Dragster.jpg)

The next step is to fill out the parameters you desire. In the circled box as shown in the figure below, you can add additional parameters. 

![Figure 17](Dragster.jpg)

To delete rows, you can select any of the button from the circled row to delete a row. 

![Figure 18](Dragster.jpg)

Based on the specific experiment, add/delete the proper number of rows. The figure below is all the rows and parameters required to run a simple genetic algorithm sample experiment.


![Figure 19](Dragster.jpg)


### Parameter Information: 

The image below demonstrates the types of options for parameters. Each parameter has a name and specific input values. 



#### Array: 

Input: An array is a list of numbers. The format should be as demonstrated below: 



Note carefully that each array starts with a square bracket ( [ ) and ends with the opposite kind. Numbers are separated by commas. 

#### Integer: 

Input: Integers. The format should be as demonstrated below



Notes: Please do not place numbers like infinity because it is highly likely the system will break. 

#### Float: 

Input: Numbers with decimals. The format should be as demonstrated below





Notes: Float is the same as integer except the increments can be decimal numbers. 

#### Boolean: 

Input: true or false

An example of input is shown below. 



Note: This is case sensitive. The system will give you an error if you have inputs like TRUE, True, trUE. 



#### Entering in Parameter Information: 



Click the Choose File button as shown in the image below. This file can be a .py, .exe, and .jar. This capability might increase later on. 



Once you click the Choose File, a Windows Explorer or Finder file dialog should pop up. The layout will vary depending on your computer. The screen should look something like this: 

![Figure 20](Dragster.jpg)

As shown above, the button triggers the window explorer to open. 

After uploading the choosing the experiment file, the screen should look like this to confirm the file is uploaded. 

![Figure 21](Dragster.jpg)

The green circle confirms that the add_nums.py file was uploaded. After you are satisfied with the file name, click on the button upload experiment as shown below. 

![Figure 22](Dragster.jpg)

After clicking the button, the experiment upload should reflect this message in the terminal. 

![Figure 23](Dragster.jpg)

The circle message means that the upload is confirmed and works. 

Afterwards, click on the Begin Experiment button as shown below to run the experiment. 

![Figure 24](Dragster.jpg)

When you run the experiment, the terminal should display the parameters in a .JSON format. The text circled in green should indicate an experiment has run successfully. 

![Figure 25](Dragster.jpg)

After the experiment is run, the results should be generated in the services/supabase/app/GLADOS_HOME/experimentName directory : 

![Figure 26](Dragster.jpg)

The high lighted file above is the results.csv file. The output should look something like this: 

![Figure 27](Dragster.jpg)

Please note that this is a sample, and things will/might look differently for you. 

Additional Options: 

Sometimes, if you want a .json file instead of. .csv file to be generated you can check the verbose option as shown below. 

![Figure 28](Dragster.jpg)

Logging Out: 

To log out, simply select the Log Out logo on the upper right. The button should look like this: 

![Figure 29](Dragster.jpg)

Afterwards, the url should look like this to confirm logout is successful.

![Figure 30](Dragster.jpg)
