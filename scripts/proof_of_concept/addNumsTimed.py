import sys
import configparser
import time

def main():
    print("waiting 10 seconds...")
    time.sleep(10)
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    result = x+y
    print(f"done with result: {result}")
    print(result)
    return 0


if __name__ == "__main__":
    main()