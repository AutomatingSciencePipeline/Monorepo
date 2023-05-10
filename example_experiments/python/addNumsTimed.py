import csv
import sys
import configparser
import time

# pylint: disable-next=pointless-string-statement
"""
This experiment adds the input x and y parameters,
but waits for an amount of time specified in the User Defined Constants before doing so.


Example settings for a run that demonstrates this:

Info:
Trial Result: AddNumResult.csv
If you want a collection of each CSV this experiment runs:
    Trial's Extra File: AddNumResult.csv
Both can be used at the same time

If you wish to test exit on timeout set
Trial Timeout: 2

Parameters:
x, default: 1, min: 1, max: 10, step: 1
y, default: 1, min: 1, max: 10, step: 1

User Defined Constants:
[wait]
waitTime = 3
"""

# pylint: disable=glados-print-used

def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    waitTime = int(config["wait"]["waitTime"])
    time.sleep(waitTime)
    with open('AddNumResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Addition', 'Subtraction'])
        writer.writerow([x + y, x - y])
    print(f"waited {waitTime} seconds...")
    print(f"done with result: {result}")
    return 0


if __name__ == "__main__":
    main()
