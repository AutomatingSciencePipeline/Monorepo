import csv
import sys
import os
import configparser
import random

def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    y = int(config["DEFAULT"]["y"])
    if random.random() > 0:
        res = x + y
    else:
        res = x - y
    with open('AddNumResult.csv', 'w') as result:
        writer = csv.writer(result)
        writer.writerow(['result'])
        writer.writerow([res])


    print("done")
    return 0


if __name__ == "__main__":
    main()