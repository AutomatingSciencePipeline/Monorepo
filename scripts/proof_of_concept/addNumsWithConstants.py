import csv
import sys
import configparser

from random import shuffle


def shuffle_word(word):
    word = list(word)
    shuffle(word)
    return ''.join(word)


def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x: int = int(config["DEFAULT"]["x"])
    y: int = int(config["DEFAULT"]["y"])
    a: int = int(config["const"]["a"])
    b: float = float(config["const"]["b"])
    c: str = config['Strings']["c"]
    invert: bool = config.getboolean("const", 'invert')
    add: float = x + y + a + b
    sub = x - y + a + b
    with open('AddNumResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Addition', 'Subtraction', 'scrambled'])
        writer.writerow([add * -1 if invert else add, sub * -1 if invert else sub, shuffle_word(c)])

    print("done")
    return 0


if __name__ == "__main__":
    main()