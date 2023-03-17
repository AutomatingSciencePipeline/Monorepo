import sys
import configparser

# pylint: disable-next=pointless-string-statement
"""
This experiment will always fail with a KeyError on every trial.

Example settings for a run that demonstrates this:

Parameters: Needed so that the experiment will actually run trials
x, default: 1, min: 1, max: 10, step: 1
y, default: 1, min: 1, max: 10, step: 1
"""

# There is intentionally unreachable code in this example
# pylint: disable=unreachable


def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    raise KeyError("Intentionally thrown exception")
    print("done")
    return 0


if __name__ == "__main__":
    main()
