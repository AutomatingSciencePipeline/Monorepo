# BioAI HW 8 User Guide

This guide is intended for students in CSSE315 BioAI to utilize the GLADOS system to run their completed code.

## Step 1: Format the .zip File for the Project

There are a couple things that need to be changed in the HW8 files to ensure that this project runs on GLADOS.

First, add this to the python imports:
 
```python
    import warnings
```

Then, add this block of code in below the last import statement:

```python
# Suppress the specific warning from pygad
warnings.filterwarnings("ignore", message="WARNING: There are no hidden layers however a value is assigned to the parameter 'hidden_activations'")
```

Next, in `fitness_function`, this line needs to be changed:

```python
    BEFORE: robotid = p.loadURDF("./URDF_Files/armsBody.urdf")
    AFTER:  robotid = p.loadURDF("../URDF_Files/armsBody.urdf")
```

After that, in the project root folder, a new file has to be included. Name this file `userProvidedFileReqs.txt`. Inside the file, the following information needs to be included:

```
numpy==1.24.4
pybullet==3.2.7
pygad==3.4.0
```

Finally, zip all of the project files into a single `.zip` and give it a appropriate name. (e.g. *bioAI_HW8_{RHITUSERNAME}.zip*).

!!! warning
    HW8 needs to be completed in order for this to run. Only continue if the fitness function for HW8 is completed and does not error.

## Step 2: Create and Run a New Experiment

First, log in with your Google or GitHub account to access the GLADOS homepage. This is the screen that wil be presented when the user is logged in:

![homepage](./homepage.png)

### Information Step

In the top left of the page, select the  button to open the new experiment panel.

Fill in the following details:

- **Name**: Any appropriate name (e.g., *BioAI-HW8_{RHITUSERNAME}*)
- **Trial Result File**: Set to ***Homework8\_Results.csv***
- **Trial's Extra File**: Leave blank
- **Trial Timeout (seconds)**: 18000 (default)
- **Executable File**: Set to ***glados\_experiment.py***

Once completed, click the **Next** button.

Example:

![infostep](./infostep.png)

### Parameter Step

Next, set up the parameters that GLADOS will handle during the experiment. 

Select `float` from the Parameter list. A new float will appear in the parameters section below. This `float` parameter needs to include the following information:

* name: mr
* min: 0.2
* max: 0.5
* step: 0.1

When completed, it will look like this:

![param](./param.png)

When completed, click **Next**.

### User Defined Constants

These constants ensure that GLADOS and the inserted code recognize the correct variables. Copy and paste the following block into the **User Defined Constants** section to map the parameter mr to the mutation_probabilty variable.

```
num_inputs = 4
num_classes = 4
num_solutions = 10
hidden_activations = sigmoid
output_activation = sigmoid
num_parents_mating = 5
num_generations = 2
mutation_probability = {mr}
parent_selection_type = rank
crossover_type = scattered
mutation_type = random
keep_parents = 0
```

When pasted, click **Next**.

### Post Process

Leave this box unchecked. Click **Next**.

### Confirmation Step

This step reviews the experiment setup. If the previous steps were followed correctly, the confirmation page should resemble the following:

```json
 {
  "hyperparameters": [
    {
      "name": "mr",
      "default": -1,
      "min": "0.2",
      "max": "0.5",
      "step": ".1",
      "type": "float",
      "useDefault": false
    }
  ],
  "name": "BioAI-HW8-6",
  "description": "",
  "trialExtraFile": "",
  "trialResult": "Homework8_Results.csv",
  "scatterIndVar": "",
  "scatterDepVar": "",
  "dumbTextArea": "[DEFAULT]\nnum_inputs = 4\nnum_classes = 4\nnum_solutions = 10\nhidden_activations = sigmoid\noutput_activation = sigmoid\nnum_parents_mating = 5\nnum_generations = 2\nmutation_probability = {mr}\nparent_selection_type = rank\ncrossover_type = scattered\nmutation_type = random\nkeep_parents = 0",
  "timeout": 18000,
  "verbose": false,
  "scatter": false,
  "keepLogs": true,
  "workers": 1,
  "file": "679e8ef960f8c8d0c659039a",
  "status": "CREATED",
  "experimentExecutable": "glados_experiment.py"
}
```

Click **Next**.

### Dispatch Step

If this is the users first experiment, the "Recent Files" section in the Dispatch Step will be empty. To add a file, drag the `.zip` file created in Step 1 into the **Upload** dropbox:

![upload](./upload.png)

Once uploaded, the file will appear as successfully selected for the experiment:

![success](./uploadedsuccess.png)

Click the **Dispatch** button to send the experiment to GLADOS.

## 3. Reviewing Results

After the experiment completes, several buttons appear to review and download data:

- **Download Results**: Click to download the raw `.csv` file.
- **Download Project Zip**: Click to download the `.zip` file containing project and run data.
- **See Graph**: Click to open an interactive graphing module to visualize variable changes during the experiment.

## 4. FAQ

### GLADOS Dev Team Contact Information

For help with running this project, contact Dr. Yoder via email or Teams and he can forward any concerns or questions to the GLADOS Dev Team. 

If there are any errors or bugs with GLADOS, a report can be submitted via the **Report** button at the top right of the GLADOS page. 

