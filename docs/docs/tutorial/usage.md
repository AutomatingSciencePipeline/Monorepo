# Usage

This section covers how to run an experiment on the system.

Definitions:

* **Trial**: A single run of submitted code with a corresponding config file

## Accessing the System

When on the Rose-Hulman network, you can access the live copy at <https://glados.csse.rose-hulman.edu/>.

If you need a local copy the system, view the [installation guide](installation.md).

You will need an account to run an experiment.

## Prepare your Code

GLADOS has limited support for experiments. To ensure your experiment may run on GLADOS, check whether it falls under [compatible specs](#compatability).

The main steps a typical experiment will need to take is:

* Ensure GLADOS supports the experiment. Specific details can be found under [Compatability](#compatability)
* Have parameters input via a `.ini` file, passed through as a command line argument
* Have output be written to a csv file
  * Alternatively, you can have a single return value be captured as the output

We provided simple example experiments [in the repository](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments). Consider using them as a guideline for how to make your experiment run on GLADOS.

For any experiment, you will need to set up your code such that it will accept a .ini config file in the form of:

```ini
[DEFAULT]
g = 5
p = 50
gl = 1
mr = 0.2
s = 1
```

Additionally, set up your code to output to a two-line csv that consists of headers and results like so:

```csv
HeaderFor1, HeaderFor2
Result1, Result2
```

Java experiments must be packaged into an executable `.jar` file.
C experiments must be compiled into a Unix binary executable.
Specifics are noted under [Compatability](#compatability).

Once your experiment is set up, continue by [running the experiment](#running-experiments)

### Compatability

GLADOS supports experiments that:

* run on Python 3.8 through a single Python file, with no external packages aside from `configparser`, and no multiprocessing/threading features
* are packaged in a `.jar` executable
* are compiled into a binary executable for Unix systems, such that a base Debian system can run it

Other experiment types may be supported, though testing is limited. *Try at your own risk*

GLADOS supports more complex outputs, like multiple files. However, currently, data aggregation is only done on a single file.
You can get all the generated files, organized by each run, by downloading the Project Zip after completion.

In the future, we plan to add more support for dependencies and other types of experiments.

## Running Experiments

This example will walk through running the Python Genetic Algorithm Experiment, which can be found [in the repository's examples](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments/python).

When first logged in, this should be what you see (except you may not have any experiments listed yet)

![landing page](https://user-images.githubusercontent.com/23245825/201237091-42cd26fa-8649-4ecb-9386-bbabc3a85a01.PNG)

To start an experiment click the blue 'new experiment' button on the top left corner on the page.
This will bring up the Experiment Information pane.

![informationStep](https://user-images.githubusercontent.com/23245825/223880912-8f234bb7-0958-4a04-ad18-81bd33d3b9cc.png)

Field Specifications:

* **Name**: The name of this experiment.
* **Description**: What this experiment is aiming to accomplish.
* **Trial Result:** If your project creates a two-line csv file to store the output of the trial, specify the name and extension of the csv file in the Trial Result textbox. (This can be the same as Extra Trial File) **This field is required.**
* **Trial Extra File:** If your project creates an extra file as its result, specify the name and extension of the file in the Extra Trial File textbox so that the system knows how to find it. (This can be the same as Trial Result)
* **Trial Timeout (seconds)**: How long the experiment will run before manually stopping itself. Defaults to 18000 seconds.
* **Keep Logs**: If you want to store any system prints from a trial, leave this checked, otherwise uncheck it.

At the bottom left of the information page, there are a few more options.

* **Experiment Count**: How many times you want this experiment to run. Represented by the number adjacent to the "Verbose?" button. **Not certain about this yet.**
* **Verbose?**: **Not certain about this yet.**

Here's an example of a filled out information page:

![filledInformationPage](https://user-images.githubusercontent.com/23245825/223881669-9d3790fa-115b-498b-9751-346b6047820f.png)

Clicking next will bring you to the parameter input page:

![parameterPage](https://user-images.githubusercontent.com/23245825/223881744-33f91bb3-0eb1-44dd-bff2-4bb2964be5a1.png)

There are 4 supported parameter types; Integers, Floats, Strings, and Booleans. Strings and booleans are treated as constants and are not iterated upon.

* **Integers** and **floats** have 4 fields:
* * **default:** The value the variable will have when not being iterated on. There is some unique syntax:
* * * default = * or default = ””: All versions of that parameter are swept for all other permutations.
* * **min:** The minimum value the variable will hold.
* * **max:** The maximum value the variable will hold.
* * **step:** The size each increment applied to the variable.
* **Strings** and **booleans** each hold a name and a value.
* * String arrays are supported.
* * Booleans are limited to **true** or **false** as values.

To add a parameter to the experiment, click on the box that contains the name of desired type of parameter. This will add a plain version of it, which you can enter more information into like so:

![emptyParams](https://user-images.githubusercontent.com/23245825/223882117-d28d2a96-c3af-425b-97cb-16005c3b7a42.png)

Then you can enter the required information.

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

There is currently only one postprocessing option:
* **Scatter Plot**: Generates a line of best fit using the data from the results of the experiment. The dependent and independent variables can be any of the user defined variables or constants. You can also use any of the headers that are defined in the TrialResults csv

Clicking next will bring up the confirmation page:

![confirmationPage](https://user-images.githubusercontent.com/23245825/223884249-eab24c91-2b8f-43f9-9423-4c9e156e99df.png)

This contains a json file of what will be passed to the backend you can check it again here.
Clicking next will bring up the Dispatch Page. Drop the .py or .jar file that you want the experiment to run on and click Dispatch to start the experiment.

**Currently, does not tell you if the file is already in. So once you drag it in once, it should be processed.**

### Results

While the system is generating the config files, this is what will appear on the dashboard:

![awaitingExpStart](https://user-images.githubusercontent.com/23245825/223901376-b047a2bc-9dc2-40d2-9d0e-6a0185f7f6cb.png)

Once the experiment starts running trials the item on the dashboard will show the following:
* The number of successes and failures
* An estimation of how long it will take the experiment to complete
* How many trials have been run so far
* How many trials are to be run

![experimentInProgress](https://user-images.githubusercontent.com/23245825/223901790-f6476518-b0bf-4745-814a-c621dc564ac3.png)

Once the experiment has completed, you will be able to download the result.csv from the "Download Results" button which contains the output and the configuration used to get said result for each trial run.

If you had an extra file produced by the experiment, chose to keep the logs from the experiment, or chose to do any post processing, you will also be able to download a zip containing those files.

An example of a completed experiment can be seen here:

![completedExperiment](https://user-images.githubusercontent.com/23245825/223902650-ed63760d-ce95-4f57-a571-a38dda141848.png)

If you wish to run the same experiment again while changing parameters you can click on "Copy Experiment" and it will open up a new experiment window with the values from the previous experiment copied over.

## Known bugs

* **(This should be fixed now!)** If something catastrophically goes wrong and the experiment cannot continue, the user is not notified. So if an experiment is stuck on "Experiment Awaiting Start" or stuck on a trial run for a long period of time it is likely that the experiment has crashed. This is currently being addressed and should be fixed in the future.
