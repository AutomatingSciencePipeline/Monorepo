# Usage

!!! note

    This section is currently being rewritten.

This section covers how to run an experiment on the system.

Definitions:

* **Trial**: A single run of submitted code with a corresponding config file

## Connect to the System

When on the Rose network, you can access the live copy at <http://glados-lb.csse.rose-hulman.edu/> (note: this is **not** https).

If you need a local copy the system, view the [installation guide](installation.md).

## Create An Account

If you don't have an account yet, create one by filling in the relevant fields on the homepage.

If you have an account, it should be auto-detected and offer to take you to the dashboard. Otherwise, got to the sign in page via the "Log In" button and enter your credentials.

## Prepare your Code

Currently, the system only accepts single file Python projects, Java .jar applications that have a single return value or output to a csv file, or Unix-compiled executables (C projects) that output to a csv file.

### Python

Example experiments written in Python can be found [in the repository](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments/python).

Before submitting an experiment to the system, you may have to:

* Ensure it can run on Python 3.8
* Ensure it does not require downloading any external packages
* Ensure it does not use Python's multiprocessing/threading features
* Modify your code so that it accepts the location of an `.ini` config file as a command line argument
* Use the `configparser` library to read the passed ini file to obtain trial parameters
* Modify your code to print out the return value to the command line (if you wish to use that approach for collecting experiment output)

Consider checking out the examples linked above to see how to do this in practice.

A guide for using .ini config files can be found here: <https://docs.google.com/document/d/1kTmFn61QkkfWvBuImnBgnrRV0LtZva7u6gRnt_BK9zY/edit> (TODO migrate to wiki page)

Set up your code such that it will accept a .ini config file in the form of

```ini
[DEFAULT]
g = 5
p = 50
gl = 1
mr = 0.2
s = 1
```

Once you're ready, proceed to [Uploading to the System](#uploading-to-the-system).

### Java

Example experiments written in Java can be found [in the repository](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments/java).

Similarly to Python configure your Java project to accept the location of a properties config file as a command line argument to get access to experiment parameters, also have your file print out the return value to the command line.

Set up your code such that it will accept a .properties config file in the form of

```properties
g = 5
p = 50
gl = 1
mr = 0.2
s = 1
```

After editing your Java project, export it into a .jar file.

A good guide on how to do so in IntelliJ can be found [here](https://www.jetbrains.com/help/idea/compiling-applications.html)

### C

Example experiments written in Java can be found [in the repository](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments/c).

Configure your C project to accept the location of a properties config file as a command line argument to get access to experiment parameters, and have your file print out the return value to the command line.

Set up your code such that it will accept a .ini config file in the form of:

```ini
[DEFAULT]
g = 5
p = 50
gl = 1
mr = 0.2
s = 1
```

To do this, utilizing [this ini parser](https://github.com/benhoyt/inih) works great.

Compile your C project for Unix systems via gcc:

```bash
gcc <your_project_files> <location of ini.c> -o <output file>
```

More info can be found [here](https://steffanynaranjo.medium.com/how-to-compile-c-files-with-gcc-step-by-step-5939ab8a6c47)

### All types

Set up your code to output to a two-line csv that consists of headers and results like so

```csv
HeaderFor1, HeaderFor2
Result1, Result2
```

## Uploading to the System

This example will walk through running the Python Genetic Algorithm Experiment, which can be found [in the repository's examples](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments/python).

When first logged in, this should be what you see (except you may not have any experiments listed yet)

![landing page](https://user-images.githubusercontent.com/23245825/201237091-42cd26fa-8649-4ecb-9386-bbabc3a85a01.PNG)

To start an experiment click the blue 'new experiment' button on the top left corner on the page.
This will bring up the Experiment Information pane.

![informationStep](https://user-images.githubusercontent.com/23245825/223880912-8f234bb7-0958-4a04-ad18-81bd33d3b9cc.png)

TODO we should add this kind of info as hover-tooltip-helpers near each field so you don't need to reference other documents for help

Field Specifications:

* **Trial Result (This field is required):** If your project creates a two-line csv file to store the output of the trial, specify the name and extension of the csv file in the Trial Result textbox. (This can be the same as Extra Trial File)
* **Trial Extra File:** If your project creates an extra file as its result, specify the name and extension of the file in the Extra Trial File textbox so that the system knows how to find it. (This can be the same as Trial Result)
* **Keep Logs**: If you want to store any system prints from a trial, leave this checked, otherwise uncheck it.

Here's an example of a filled out information page:

![filledInformationPage](https://user-images.githubusercontent.com/23245825/223881669-9d3790fa-115b-498b-9751-346b6047820f.png)

Clicking next will bring you to the parameter input page:

![parameterPage](https://user-images.githubusercontent.com/23245825/223881744-33f91bb3-0eb1-44dd-bff2-4bb2964be5a1.png)

There are 4 supported parameter types; Integers, Floats, Strings, and Booleans. Strings and booleans are treated as constants and are not iterated upon.

* Integers and floats have 4 fields, default, min, max, and step. default is the default value the variable will have when not being iterated. min, max, and step determine how the variable will be iterated.
* Strings and Booleans are constants

To add a parameter to the experiment click on the box that contains the name of desired type of parameter. This will add a form item that you can enter more information into like so.

![emptyParams](https://user-images.githubusercontent.com/23245825/223882117-d28d2a96-c3af-425b-97cb-16005c3b7a42.png)

You can then enter in the required information.

Here's an example of a filled parameter page:

![filledParams](https://user-images.githubusercontent.com/23245825/223882365-97057fe0-9e48-49ec-bcd4-8ddc88661b02.png)

Once you have entered your parameter information, clicking next will bring you to the user defined constants page.

![constsPage](https://user-images.githubusercontent.com/23245825/223882904-ae4646b3-bcd8-417a-9f74-143c67092bea.png)

On this page you can optionally define the values for the variables that do not need to be iterated upon.
You must input information into the text area as if it were text inside an .ini or .config file, because it will be appended directly to the end of each trial's input ini file.

Here's an example of a possible valid entry in this field:

```ini
[const]
a = -1
;test comment
b = 10.5
invert = False
[Strings]
c = Test String
```

Any input to the textarea will not be validated, so make sure that the data is formatted correctly!

Clicking next will bring you to the Post Process page:

![postProcess](https://user-images.githubusercontent.com/23245825/223883336-350b4a7a-f85a-4763-9d52-4cfc33425e20.png)

There is currently only one post processing option: it generates a Scatter Plot with a line of best fit using the data from the results of the experiment. The dependent and independent variables can be any of the user defined variables or constants. You can also use any of the headers that are defined in the TrialResults csv

Clicking next will bring up the confirmation page:

![confirmationPage](https://user-images.githubusercontent.com/23245825/223884249-eab24c91-2b8f-43f9-9423-4c9e156e99df.png)

This contains a json file of what will be passed to the backend you can check it again here.
Clicking next will bring up the Dispatch Page. Drop the .py or .jar file that you want the experiment to run on and click Dispatch which will start the experiment.

## Experiment is Running

While the system is generating the config files this is what will appear on the dashboard:

![awaitingExpStart](https://user-images.githubusercontent.com/23245825/223901376-b047a2bc-9dc2-40d2-9d0e-6a0185f7f6cb.png)

Once the experiment starts running trials the item on the dashboard will provide; how many trials are to be run, how many trials have been run so far, the number of successes and failures, and an estimation of how long it will take the experiment to complete.

![experimentInProgress](https://user-images.githubusercontent.com/23245825/223901790-f6476518-b0bf-4745-814a-c621dc564ac3.png)

Once the experiment has completed you will be able to download the result.csv from the "Download Results" button which contains the output and the configuration used to get said result for each trial run.

If you had an extra file produced by the experiment, chose to keep the logs from the experiment, or chose to do any post processing, you will also be able to download a zip containing those files.

An example of a completed experiment can be seen here:

![completedExperiment](https://user-images.githubusercontent.com/23245825/223902650-ed63760d-ce95-4f57-a571-a38dda141848.png)

If you wish to run the same experiment again while changing parameters you can click on "Copy Experiment" and it will open up a new experiment window with the values from the previous experiment copied over.

## Known bugs

* If something catastrophically goes wrong and the experiment cannot continue, the user is not notified. So if an experiment is stuck on "Experiment Awaiting Start" or stuck on a trial run for a long period of time it is likely that the experiment has crashed. This is currently being addressed and should be fixed in the future.
