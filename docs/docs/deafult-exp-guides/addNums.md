# AddNums Experiment

## Description
The `AddNums` experiment is a simple Python script that demonstrates how to output additional information to a file and integrate it into a system for further analysis. The script performs basic arithmetic operations (addition and subtraction) on two input parameters (`x` and `y`) and writes the results to a CSV file. This experiment showcases two ways to gather additional information:
1. **Trial's Extra File**: Collects the generated CSV file and places it in a zip file for download after the experiment completes.
2. **Trial Result**: Integrates the information from the generated CSV into the result CSV for the experiment.

## Parameters
The script accepts the following parameters via a configuration file:
- **`x`**: The first integer input for the arithmetic operations.
- **`y`**: The second integer input for the arithmetic operations.

### Example Configuration File
```ini
[DEFAULT]
x = 5
y = 3

## Output
The script generates a CSV file named `AddNumResult.csv` in the current working directory. The file contains two rows:
1. **Headers**: Describes the columns in the CSV file.
2. **Values**: Contains the results of the arithmetic operations.

### Example Output
If `x = 5` and `y = 3`, the contents of `AddNumResult.csv` will be:
```csv
Addition,Subtraction
8,2


## Notes
- The `AddNums` script is designed to demonstrate how to output and integrate additional information into a system.
- Both **Trial's Extra File** and **Trial Result** functionalities can be used simultaneously to gather and analyze the output data.
- Ensure that the configuration file (`config.ini`) is correctly formatted and contains valid integer values for `x` and `y`.
- The generated `AddNumResult.csv` file will be overwritten each time the script is executed, so make sure to save or rename the file if needed.
- The script requires Python 3.x and the `configparser` module to run successfully.