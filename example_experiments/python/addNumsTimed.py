import sys
import configparser
import time

# pylint: disable-next=pointless-string-statement
"""
This experiment adds the input x and y parameters,
but waits for an amount of time specified in the parameters before doing so.

Example settings for a run that demonstrates this:

Parameters:
x, default: 1, min: 1, max: 10, step: 1
y, default: 1, min: 1, max: 10, step: 1
waitTime, default: 3, min: 3, max: 3, step: 3
"""


def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    waitTime = int(config["DEFAULT"]["waitTime"])
    print(f"waiting {waitTime} seconds...")
    time.sleep(waitTime)
    result = x + y
    print(f"done with result: {result}")
    print(result)
    return 0


if __name__ == "__main__":
    main()
