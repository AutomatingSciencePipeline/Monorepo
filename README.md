# GLADOS: The Open Science Project

GLADOS is an open sourced student-driven project geared towards building a high-performance modular computational pipeline for running big data experiments in a parallel fashion.

Link to NextJS Frontend Repo: https://github.com/rhit-fayoumoa/glados-next

## User Guide

This user guide is meant to assist first time users in running an experiment. There are some systems that need to be installed, like Docker. In terms of dependencies that need to be installed, there should be none or you need to make sure you are able to use the languages Javascript and Python. 

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

![Figure 1](https://i.ibb.co/9V7qv03/figure1.png)

3. Copy paste the URL in the text as shown below. 

![Figure 2](https://i.ibb.co/ykbLzxG/figure2.png)

4. Afterward you should see the final command: 

![Figure 3](https://i.ibb.co/k9mCz8q/figure3.png)

5. Next, hit enter and the installation should take less than a minute. 

6. The below figure demonstrates what the repo should look like when cloning. 

![Figure 4](https://i.ibb.co/tBXTGpY/figure4.png)



7. Successful cloning should display the following output in the terminal. 

![Figure 5](https://i.ibb.co/JtyZF1n/figure5.png)

### Running the Code:

To run the code you need to first navigate to the Monorepo/services/supabase directory. The directory should look like this: 

![Figure 6](https://i.ibb.co/FJ0QSKT/figure6.png)

2.  Type in `docker-compose up --build` (Note: can also use the flag -d to detach the containers, allowing you to do other things in terminal. To close docker like this, use the command `docker-compose -down`

3. When running you will get a bunch of messages popping up. However, the most important thing is at the end you should receive this message circled in green: 

![Figure 7](https://i.ibb.co/brWvYqY/figure7.png)

Just to note, if you run Glados for the first time creating the image will take a couple of minutes or more. After that, it should pretty quickly. 

Additionally, make sure that you have docker running before you run the previous command. Otherwise, you might get this message: 

![Figure 8](https://i.ibb.co/VCZ3QRB/figure8.png)


4. To log into Glados enter in `localhost:5005`. The application should run through port 5005. The start page will look like: 

![Figure 9](https://i.ibb.co/gWmBN48/figure9.png)

Creating a User: 

To create a user select the “Create Account” button as shown below. 

![Figure 10](https://i.ibb.co/n8b5qYx/figure10.png)

Next, when you press that button a pop up should appear and look like this: 

![Figure 11](https://i.ibb.co/V01HjSJ/figure11.png)

3. Make sure to enter in an email with more than six characters and a valid password. If you meet none of these criteria, a warning message will pop up. It will look like this: 
 
![Figure 12](https://i.ibb.co/QdJV413/figure12.png)

4. After the proper information is created, you will be redirected to the user page. It should look like this. 

![Figure 13](https://i.ibb.co/DVn4wZm/figure16.png)


### Logging into System 

After seeing the home page, enter in your user name and password. press the Login button as circled in the below image. 

![Figure 14](https://i.ibb.co/bNG7q8d/figure14.png)

2. After pressing the button, you should see a blank experiment page. The next subsection Running and Experiment goes into more detail. However, if you input the wrong password. You will get an alert like this: 

![Figure 15](https://i.ibb.co/FBtR4zj/figure15.png)



### Running An Experiment: 

If you want to watch a video on running an experiment instead of reading it, here is the link: https://youtu.be/XGiNnODBTPE. 

After you are logged in, you should reach this home page: 

![Figure 16](https://i.ibb.co/DVn4wZm/figure16.png)

The next step is to fill out the parameters you desire. In the circled box as shown in the figure below, you can add additional parameters. 

![Figure 17](https://i.ibb.co/st9yPJK/figure20.png)

To delete rows, you can select any of the button from the circled row to delete a row. 

![Figure 18](https://i.ibb.co/t3kgpWy/figure18.png)

Based on the specific experiment, add/delete the proper number of rows. The figure below is all the rows and parameters required to run a simple genetic algorithm sample experiment.


![Figure 19](https://i.ibb.co/zN2MXKf/figure19.png)


### Parameter Information: 

The image below demonstrates the types of options for parameters. Each parameter has a name and specific input values. 

![Parameters](https://i.ibb.co/st9yPJK/figure20.png)

#### Array: 

Input: An array is a list of numbers. The format should be as demonstrated below: 

![Array](https://i.ibb.co/HT8gS50/figurearr.png)

Note carefully that each array starts with a square bracket ( [ ) and ends with the opposite kind. Numbers are separated by commas. 

#### Integer: 

Input: Integers. The format should be as demonstrated below

![Integer](https://i.ibb.co/DY1rq6y/figureint.png)

Notes: Please do not place numbers like infinity because it is highly likely the system will break. 

#### Float: 

Input: Numbers with decimals. The format should be as demonstrated below


![Float](https://i.ibb.co/BTSWGpK/figurefloat.png)


Notes: Float is the same as integer except the increments can be decimal numbers. 

#### Boolean: 

Input: true or false

An example of input is shown below. 

![Boolean](https://i.ibb.co/Jrwn2yr/figureboo.png)

Note: This is case sensitive. The system will give you an error if you have inputs like TRUE, True, trUE. 



### Entering in Parameter Information: 

![Experiment is setup](https://i.ibb.co/cTY05RB/figure21.png)

Click the Choose File button as shown in the image below. This file can be a .py, .exe, and .jar. This capability might increase later on. 

![Choose file](https://i.ibb.co/dQBfzrJ/figure22.png)

Once you click the Choose File, a Windows Explorer or Finder file dialog should pop up. The layout will vary depending on your computer. The screen should look something like this: 

![Figure 20](https://i.ibb.co/TrtLzKq/figure23.png)

As shown above, the button triggers the window explorer to open. 

After uploading the choosing the experiment file, the screen should look like this to confirm the file is uploaded. 

![Figure 21](https://i.ibb.co/pJpF2N4/figure24.png)

The green circle confirms that the add_nums.py file was uploaded. After you are satisfied with the file name, click on the button upload experiment as shown below. 

![Figure 22](https://i.ibb.co/z86z7JW/figure25.png)

After clicking the button, the experiment upload should reflect this message in the terminal. 

![Figure 23](https://i.ibb.co/wsSp2C9/figure26.png)

The circle message means that the upload is confirmed and works. 

Afterwards, click on the Begin Experiment button as shown below to run the experiment. 

![Figure 24](https://i.ibb.co/zfG1XZh/figure27.png)

When you run the experiment, the terminal should display the parameters in a .JSON format. The text circled in green should indicate an experiment has run successfully. 

![Figure 25](https://i.ibb.co/CWTFH1d/figure28.png)

After the experiment is run, the results should be generated in the services/supabase/app/GLADOS_HOME/experimentName directory : 

![Figure 26](https://i.ibb.co/S0GfNdf/29.png)

The high lighted file above is the results.csv file. The output should look something like this: 

![Figure 27](https://i.ibb.co/njB948p/figure30.png)

Please note that this is a sample, and things will/might look differently for you. 

### Additional Options: 

Sometimes, if you want a .json file instead of. .csv file to be generated you can check the verbose option as shown below. 

![Figure 28](https://i.ibb.co/S3vFzV7/addopt.png)

### Logging Out: 

To log out, simply select the Log Out logo on the upper right. The button should look like this: 

![Figure 29](https://i.ibb.co/dpq41k3/logout1.png)

Afterwards, the url should look like this to confirm logout is successful.

![Figure 30](https://i.ibb.co/ZNYQ3mM/logout2.png)
