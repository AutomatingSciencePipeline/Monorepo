import csv
import sys
import os
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
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    a = int(config["DEFAULT"]["a"])
    b = float(config["DEFAULT"]["b"])
    c = config["DEFAULT"]["c"]
    invert = config.getboolean("DEFAULT",'invert')
    add = x + y + a + b
    sub = x - y + a + b
    with open('AddNumResult.csv', 'w') as result:
        writer = csv.writer(result)
        writer.writerow(['Addition', 'Subtraction','scrambled'])
        writer.writerow([add*-1 if invert  else add, sub*-1 if invert  else sub, shuffle_word(c)])


    print("done")
    return 0


if __name__ == "__main__":
    main()