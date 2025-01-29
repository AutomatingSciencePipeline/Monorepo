# Usage

This section covers how to run an experiment on the system.

Definitions:

* **Trial**: A single run of submitted code with a corresponding config file

## Accessing the System

When on the Rose-Hulman network, you can access the live copy at <https://glados.csse.rose-hulman.edu/>.

If you need a local copy the system, view the [installation guide](installation.md).

You will need to sign in with either a Google or Github account to run an experiment.

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

You are able to format the generated ini file by using the "User Defined Constants" tab while creating an experiment.

To accomplish this use the parameter name in the constants inside of curly brackets.

Example:

I have a parameter named seed that goes from 1-10 incrementing by 1.

I then put this inside of the text box on the "User Defined Constants" tab.

```ini
[SEED]
random_seed = {seed}
```

This allows us to format with extra ini sections.

Additionally, set up your code to output to a two-line csv that consists of headers and results like so:

```csv
HeaderFor1, HeaderFor2
Result1, Result2
```

Note: If your csv is more than 2 lines, there is a place on the "Information" tab to select which line will be used.

Java experiments must be packaged into an executable `.jar` file.
C experiments must be compiled into a Unix binary executable (for basic users).
Specifics are noted under [Compatability](#compatability).

Once your experiment is set up, continue by [running the experiment](#running-experiments)

### Compatability

GLADOS supports experiments that:

* run on Python 3.8 through a single Python file
* are packaged in a `.jar` executable
* are compiled into a binary executable for Unix systems, such that a base Debian system can run it
* zip files that contain one of the file types above

Other experiment types may be supported, though testing is limited. *Try at your own risk*

GLADOS supports more complex outputs, like multiple files. However, currently, data aggregation is only done on a single file.
You can get all the generated files, organized by each run, by downloading the Project Zip after completion.

In the future, we plan to add more support for dependencies and other types of experiments.

## Running Experiments

For our running experiment example, we will use our default experiments feature.

To create your own experiment from scratch press the "New Experiment" button below your email in the top left corner of the dashboard.

Upon first logged in, this should be what you will see (except you will not have any experiments listed yet).

<!-- ![dashboard](TODO: Put link here) -->

Now we will click the "Run a Default Experiment" button on the right side of the screen.

<!-- ![run_default](TODO: Put link here) -->

You will then be shown a modal where we will select Add Nums (Python).

<!-- ![select_default](TODO: Put link here) -->

You will be shown an already filled out experiment.

The first tab we will look at in the experiment creation pop out is the "Information" tab.

### Information Tab

<!-- ![information_tab](TODO: Put link here) -->

#### Name - Required

This is the name that will be shown in the UI for this experiment.

#### Description - Optional

This is a description that will be stored with the experiment record.

#### Trail Result - Required

This is the csv file that will be captured into the experiment results.

#### Trial's Extra File - Optional

This can be a folder or a file that will be included inside of the project zip that can be downloaded after experiment completion.

#### Trial Timeout (seconds) - Required

This is how long until the experiment will be automatically timed out.

#### Executable File (leave empty if not using zip) - Required for zip experiments

If using a zip experiment, put the name of the main executable in this text area.

#### Keep Logs - Required

Select to store the logs from the experiment runner pod.

##

### Parameters Tab

<!-- ![parameters_tab](TODO: Add link here) -->

Currently there are 5 parameter types.

#### Integer

For an integer you will have 4 or 5 fields, depending on if default is enabled.

If default is not enabled (like the example):

1. Name - the name of the parameter that will be filled into the ini file.

2. Min - the min value of the integer.

3. Max - the max value of the integer.

4. Step - the value that the integer parameter will step by.

If default is enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Default - when using a default value this field is what will be used when generating permutations. We will cover [permutation generation](https://glados.csse.rose-hulman.edu) later in this guide.

<!-- TODO: Update link -->

3. Min - the min value of the integer.

4. Max - the max value of the integer.

5. Step - the value that the integer parameter will step by.

#### Float

Exactly the same as an integer, but supports decimal numbers.

#### Bool

If default is not enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Value - true/false

If default is enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Default - [permutation generation](#permutations) for more explanation.

3. Value - true/false

#### String

If default is not enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Value - a string value.

If default is enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Default - [permutation generation](#permutations) for more explanation.

3. Value - a string value.

#### Stringlist

If default is not enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Edit String - Click here to edit the strings that will be iterated when generating permutations.

If default is enabled:

1. Name - the name of the parameter that will be filled into the ini file.

2. Default - [permutation generation](#permutations) for more explanation.

2. Edit String - Click here to edit the strings that will be iterated when generating permutations.

### User Defined Constants Tab

<!-- ![user_defined_contants_tab](TODO: Add link here) -->

This tab allows the user to define a text block that will be appended to every config ini that is generated. You can use parameters from the "Parameters" tab in this section if you put the parameter name inside of the text area inside of curly brackets.

For example:

```ini
[DEFAULT]
test_var = {test}
```

### Post Process Tab

<!-- ![post_process_tab](TODO: Add link here) -->

This tab allows you to include a scatter plot when the project zip is downloaded. This feature will eventually be superseded by the ChartJS functionality on the dashboard.

### Confirmation

<!-- ![confirmation_tab](TODO: Add link here) -->

This tab will allow you to confirm all of the hyperparameters and other settings of the experiment.

### Dispatch

<!-- ![user_defined_contants_tab](TODO: Add link here) -->

We call this page the "Dispatch" tab because we start the experiment from here.

You have 2 options here:

1. Select a file from the 5 most recent files you have used.

2. Upload a new file.

When you upload a file, it will automatically be selected.

If your experiment was a copy, the file will be preselected for you.

## Results

The system will run the experiment and show you progress as it is doing so.

Below is what the experiment will like when it is running.

<!-- ![in_progress_exp](TODO: Add link here) -->

Once the experiment starts running trials the item on the dashboard will provide; how many trials are to be run, how many trials have been run so far, the number of successes and failures, and an estimation of how long it will take the experiment to complete.

You also have the option to cancel an experiment. This will stop the execution of the experiment and no results will be available.

Note: Sometime small experiments will finish before the system manages to stop the process. In this case the experiment will be shown as completed and behave like an experiment that was not cancelled.

Note: Currently "Expected Total Time" does not account for the system running the experiments in parallel, so time may be substantially faster than this metric claims.

<!-- ![finished_exp](TODO: Add link here) -->

Once the experiment has completed you will be able to download the result.csv from the "Download Results" button which contains the output and the configuration used to get said result for each trial run.

If you had an extra file produced by the experiment, chose to keep the logs from the experiment, or chose to do any post processing, you will also be able to download a zip containing those files.

If you wish to run the same experiment again while changing parameters you can click on "Copy Experiment" and it will open up a new experiment window with the values from the previous experiment copied over.

If you wish to view the results on the dashboard page you can click the "See Graph" button and you will have several options for graphing your results.

Users can also share experiments with other users. To accomplish this, click the "Share Experiment" button. A link will be copied to the clipboard, share this link with another user and they can click it and view the experiment on their dashboard.

Shared experiments behave the same as your own experiments, but the shared user cannot delete the experiment. They only have the option to unfollow.

## Permutations

This section will cover permutation generation in detail.

When a user creates hyperparameters (in the "Parameters" tab), these are the values that will be iterated through the fill up the ini config file.

### Example 1

We will ignore defaults for now.

I have an integer value with the properties following properties:

* Name: test

* Min: 1

* Max: 10

* Step: 1

In the this means we will have 10 permutations, test equals 1-10.

config0

```ini
[DEFAULT]
test=0
```

config1

```ini
[DEFAULT]
test=1
```

And so on...

"[DEFAULT]" is the default header values for permutations generated.

### Example 2

Now lets talk about "defaults".

This allows you to lessen the amount permutations generated for your experiment.

Lets say we have the following parameters:

An integer with the following properties:

* Name: x

* Default: 1

* Min: 1

* Max: 10

* Step: 1

Another integer with the following properties:

* Name: y

* Default: 11

* Min: 11

* Max: 20

* Step: 1

Now we also have a stringlist with the following properties:

* Name: test

* Default: "two"

* Values: ["one", "two", "three"]

When generating the config ini it will look like this:

config0

```ini
x=1
y=11
test=two
```

config1

```ini
x=2
y=11
test="two"
```

...

config10

```ini
x=1
y=11
test="two"
```

config11

```ini
x=1
y=12
test="two"
```

...

config20

```ini
x=1
y=11
test="one"
```

And so on...

The thing to notice is that for *ALL* configs generated while iterating x, y will equal 11, and test will equal "two". The default value makes it so permutations are not generated for every value, but defaults are used instead.

## Known bugs

* If something catastrophically goes wrong and the experiment cannot continue, the user is not notified. So if an experiment is stuck on "Experiment Awaiting Start" or stuck on a trial run for a long period of time it is likely that the experiment has crashed. This is currently being addressed and should be fixed in the future.

