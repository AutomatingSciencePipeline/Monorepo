import csv
import sys
import configparser

# pylint: disable-next=pointless-string-statement
"""
This experiment demonstrates outputting additional information to a file
and telling the system to gather the data from that file.
David, add more info here please.

Example settings for a run that demonstrates this:

Parameters:
x, 1, 1, 10, 1
y, 1, 1, 10, 1
"""


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
