import sys
import configparser


def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    if x == 1 and y == 2:
        raise (KeyError)
    print(x + y)
    print("done")
    return 0


if __name__ == "__main__":
    main()