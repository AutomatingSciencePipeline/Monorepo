import sys
import configparser

# pylint: disable-next=pointless-string-statement
"""
This experiment demonstrates how to read values that were specified as parameters in the frontend
from the config files created by the system.

Example settings for a run that demonstrates this:

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
    print(x + y)
    print("done")
    return 0


if __name__ == "__main__":
    main()
