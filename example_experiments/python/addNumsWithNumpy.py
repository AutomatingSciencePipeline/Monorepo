import csv
import sys
import configparser

# import a random python package to test
import numpy as np

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
    # make sure np works
    print("NUMPY:", np.array([1, 2, 3, 4, 5]))
    with open('AddNumResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Addition', 'Subtraction'])
        writer.writerow([x + y, x - y])

    print("done")
    return 0


if __name__ == "__main__":
    main()
