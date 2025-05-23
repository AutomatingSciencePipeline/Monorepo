# AddNums Experiment

## Description
The `AddNums` experiment is a simple Python script that demonstrates how to set up GLADOS with basic parameters. The script performs basic arithmetic operations (addition and subtraction) on two input parameters (`x` and `y`) and writes the results to a CSV file. This experiment showcases two ways to gather additional information:
1. **Trial's Extra File:** Gathers the designated file that a run of the file generates and places in a zip to be uploaded when
        the experiment completes
2. **Trial Result:** Integrates the information from a 2 line csv of headers and values that the file run generates
        and adds them to the result csv that is being uploaded

## Parameters
The script accepts the following parameters via a configuration file:
- **`x`**: The first integer input for the arithmetic operations.
- **`y`**: The second integer input for the arithmetic operations.

### Example Configuration File
```ini
[DEFAULT]
x = 5
y = 3
```

## Output
The script generates a CSV file named `AddNumResult.csv` in the current working directory. The file contains two rows:
1. **Headers**: Describes the columns in the CSV file.
2. **Values**: Contains the results of the arithmetic operations.

### Example Output
If `x = 5` and `y = 3`, the contents of `AddNumResult.csv` will be:
```csv
Addition,Subtraction
8,2
```

## Notes
- The `AddNums` script is designed to demonstrate config files and show an output for GLADOS.
- Both **Trial's Extra File** and **Trial Result** functionalities can be used simultaneously to gather and analyze the output data.
- Ensure that the configuration file (`config.ini`) is correctly formatted and contains valid integer values for `x` and `y`.
- The generated `AddNumResult.csv` file will be overwritten each time the script is executed, so make sure to save or rename the file if needed.
- The script requires Python 3.x and the `configparser` module to run successfully.

## Full Python File

```py
import csv
import sys
import configparser

# pylint: disable-next=pointless-string-statement
"""
This experiment demonstrates outputting additional information to a file
and telling the system to gather the data from that file.

There are two different ways to gather additional information from an experiment
    - Trial's Extra File: Gathers the designated file that a run of the file generates and places in a zip to be uploaded when
        the experiment completes
    - Trial Result: Integrates the information from a 2 line csv of headers and values that the file run generates
        and adds them to the result csv that is being uploaded

How to tell if they worked
    - Trial's Extra File: You can download a zip file that contains the different output files specified
    - Trial Result: The result csv downloaded has been expanded with information from the specified file


Example settings for a run that demonstrates this: (Any Fields not specified can be left blank or to whatever their default is)

Info:
Trial Result: AddNumResult.csv
If you want a collection of each CSV this experiment runs:
    Trial's Extra File: AddNumResult.csv
Both can be used at the same time

Parameters:
x, 1, 1, 10, 1
y, 1, 1, 10, 1
"""

# pylint: disable=glados-print-used

def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    with open('AddNumResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Addition', 'Subtraction'])
        writer.writerow([x + y, x - y])

    print("done")
    return 0


if __name__ == "__main__":
    main()

```