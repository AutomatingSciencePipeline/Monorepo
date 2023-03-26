import csv
import sys
import configparser
import time

# pylint: disable-next=pointless-string-statement
"""
This experiment will fail with a KeyError in a trial where x==1 and y==5, but will succeed otherwise.

Example settings for a run that demonstrates this:

Info:
Trial Result: AddNumResult.csv
If you want a collection of each CSV this experiment runs:
    Trial's Extra File: AddNumResult.csv
Both can be used at the same time

Parameters:
x, default: 1, min: 1, max: 10, step: 1
y, default: 1, min: 1, max: 10, step: 1
"""


def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    if x == 1 and y == 5:
        time.sleep(5)
        raise KeyError('Intentionally thrown exception because x==1 and y==5')
    with open('AddNumResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Addition', 'Subtraction'])
        writer.writerow([x + y, x - y])

    print(x + y)
    print("done")
    return 0


if __name__ == "__main__":
    main()
