import sys
import configparser
import time

# pylint: disable-next=pointless-string-statement
"""
Example settings for a successful run:

Parameters:
x, 1, 1, 10, 1
y, 1, 1, 10, 1
waitTime 3, 3, 3, 3

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
    result = x+y
    print(f"done with result: {result}")
    print(result)
    return 0


if __name__ == "__main__":
    main()
