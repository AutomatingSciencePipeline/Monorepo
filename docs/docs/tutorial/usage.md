# Usage

This section covers how to run an experiment on the system.

## Definitions

- **Trial**: A single run of submitted code with a corresponding config file.

## Accessing the System

When connected to the Rose-Hulman network, you can access the live system at <https://glados.csse.rose-hulman.edu/>.

If you need a local copy of the system, refer to the [installation guide](installation.md).

You must sign in with either a Google or GitHub account to run an experiment.

## Preparing Your Code

GLADOS has limited support for experiments. To ensure your experiment runs properly, check whether it meets the [compatibility requirements](#compatibility).

The main steps to prepare an experiment are:

1. Ensure GLADOS supports your experiment. Details are available under [Compatibility](#compatibility).
2. Use a `.ini` file to input parameters, passed as a command-line argument.
3. Output results to a CSV file, or return a single value as the output.

We provide example experiments in the [repository](https://github.com/AutomatingSciencePipeline/Monorepo/tree/main/example_experiments). Consider using them as a guideline for formatting your experiment.

Your experiment must be configured to accept a `.ini` config file structured as follows:

```ini
[DEFAULT]
g = 5
p = 50
gl = 1
mr = 0.2
s = 1
```

You can format the generated `.ini` file using the "User Defined Constants" tab while creating an experiment. Use curly brackets `{}` to reference parameter names.

Example:

If you have a parameter named `seed` ranging from 1 to 10 (incrementing by 1), you can define it in the "User Defined Constants" tab as:

```ini
[SEED]
random_seed = {seed}
```

This allows additional `.ini` sections to be included dynamically.

Your experiment must also output results in a two-line CSV format with headers and corresponding values:

```csv
HeaderFor1, HeaderFor2
Result1, Result2
```

> **Note:** If your CSV file contains more than two lines, you can specify which line should be used in the "Information" tab.

Java experiments must be packaged as an executable `.jar` file.
C experiments must be compiled into a Unix binary executable (for basic users).
Specific requirements are outlined under [Compatibility](#compatibility).

Once your experiment is set up, proceed to [Running the Experiment](#running-experiments).

## Compatibility

GLADOS supports experiments that:

- Run on Python 3.8 as a single Python file.
- Are packaged as an executable `.jar` file.
- Are compiled into a binary executable for Unix systems, runnable on a base Debian system.
- Are contained in a zip file that includes one of the above file types.

Other experiment types may be supported, but testing is limited. *Use at your own risk.*

GLADOS supports complex outputs, including multiple files. However, data aggregation is currently limited to a single file.

After completion, you can download all generated files, organized by each trial run, in a Project Zip.

Future updates will improve support for dependencies and additional experiment types.

### Extra Features

> **Note:** These files can only be provided inside of zip files!

Users can provide a file called "userProvidedFileReqs.txt". This file is a Python requirements file. When this file is provided all packages will be automatically installed.

Privileged users have the option to provide two files:

- packages.txt - this contains Debian packages to be installed to the runner.

- commandsToRun.txt - this file contains bash commands that will be run on the runner after packages have been installed.

## Running Experiments

To create a new experiment, click the "New Experiment" button below your email in the top-left corner of the dashboard.

Upon first login, your dashboard will be empty.

![dashboard](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/dashboard.png)

To run a default experiment, click the "Run a Default Experiment" button on the right side of the screen.

![run_default](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/run_default_exp.png)

You will see a modal where you can select "Add Nums (Python)." This will present an already configured experiment.

![select_default](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/select_default.png)

The experiment creation interface consists of multiple tabs:

### Information Tab

![information_tab](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/information_tab.png)

#### Name *(Required)*

The name displayed in the UI for this experiment.

#### Description *(Optional)*

A description stored with the experiment record.

#### Trial Result *(Required)*

The CSV file captured as the experiment result.

#### Trial's Extra File *(Optional)*

A folder or file included in the downloadable Project Zip after experiment completion.

#### Trial Timeout (Seconds) *(Required)*

The duration before the experiment automatically times out.

#### Executable File *(Required for zip experiments)*

If using a zip experiment, specify the main executable filename.

#### Keep Logs *(Required)*

Select this option to store logs from the experiment runner pod.

### Parameters Tab

![parameters_tab](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/parameters_tab.png)

There are five parameter types:

#### Integer

- **Name**: The parameter name used in the `.ini` file.
- **Min**: Minimum value.
- **Max**: Maximum value.
- **Step**: Increment value.
- **Default** (if enabled): The default value used when generating permutations.

#### Float

Similar to Integer but supports decimal values.

#### Boolean

- **Name**: The parameter name.
- **Value**: `true/false`
- **Default** (if enabled): Used in permutation generation.

#### String

- **Name**: The parameter name.
- **Value**: A string value.
- **Default** (if enabled): Used in permutation generation.

#### String List

- **Name**: The parameter name.
- **Edit String**: Defines a list of strings to iterate over in permutations.
- **Default** (if enabled): Used in permutation generation.

### User Defined Constants Tab

![user_defined_constants_tab](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/user_defined_constants.png)

This tab allows defining a text block appended to every generated `.ini` config file. You can use parameters from the "Parameters" tab inside curly brackets.

Example:

```ini
[DEFAULT]
test_var = {test}
```

### Post Process Tab

![post_process_tab](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/post_process.png)

This tab allows you to include a scatter plot in the downloadable Project Zip. This feature will be replaced by ChartJS functionality on the dashboard in future updates.

### Confirmation Tab

![confirmation_tab](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/confirmation.png)

This tab allows you to review all hyperparameters and settings before running the experiment.

### Dispatch Tab

![dispatch_tab](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/dispatch.png)

You can start an experiment from this tab by either:

1. Selecting a file from the five most recent ones used.
2. Uploading a new file.

If you copied an experiment, the file will be preselected.

## Results

Once the experiment starts, you can monitor progress in real time.

The dashboard will display:

- Total trials.
- Completed trials.
- Successes and failures.
- Estimated time to completion.

Example below:

![in_progress_exp](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/in_progress_exp.png)

You can cancel an experiment at any time. However, small experiments may finish before cancellation takes effect.

> **Note:** The "Expected Total Time" metric does not account for parallel execution, so actual completion may be faster.

Example of completed experiment:

![finished_exp](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/finished_exp.png)

After completion, you can download the `results.csv` file, which contains output data and configurations for each trial. If extra files were generated, logs were kept, or post-processing was applied, a zip file will also be available.

To rerun an experiment with modified parameters, click "Copy Experiment."

To visualize results, click "See Graph" on the dashboard.

Experiments can also be shared with other users. Click "Share Experiment" to copy a shareable link. Shared users can view but not delete the experiment.

## Permutations

This section explains how parameter permutations are generated.

### Example 1: No Defaults

An integer parameter `test` with:

- Min: `1`
- Max: `10`
- Step: `1`

will generate 10 configurations:

```ini
[DEFAULT]
test=1
```

```ini
[DEFAULT]
test=2
```

... up to `test=10`.

> **Note:** Every parameter will go under the [DEFAULT] header unless defined in the "User Defined Constants" tab.

### Example 2: Using Defaults

An integer parameter `x` with:

- Min: `1`
- Max: `10`
- Step: `1`
- Default: `1`

An integer parameter `y` with:

- Min: `11`
- Max: `20`
- Step: `1`
- Default: `11`

An stringlist parameter `test` with:

- Values: `["one", "two", "three"]`
- Default: `two`

will generate 21 configurations (after duplicates are removed):

```ini
[DEFAULT]
x=1
y=11
test="two"
```

```ini
[DEFAULT]
x=2
y=11
test="two"
```

... up to `x=10, y=11, test="two"`

```ini
[DEFAULT]
x=1
y=11
test="two"
```

```ini
[DEFAULT]
x=1
y=12
test="two"
```

... up to `x=1, y=20, test="two"`

```ini
[DEFAULT]
x=1
y=11
test="one"
```

```ini
[DEFAULT]
x=1
y=11
test="two"
```

```ini
[DEFAULT]
x=1
y=11
test="three"
```

That will be all generated permutations.

> **Note:** Some of the examples shown were duplicates and would be removed automatically.

## Known Bugs

- If an experiment crashes, users are not notified. If an experiment is stuck on "Experiment Awaiting Start" or a trial takes too long, it has likely failed. A fix is in progress.