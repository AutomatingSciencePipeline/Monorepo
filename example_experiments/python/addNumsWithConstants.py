import csv
import sys
import configparser

from random import shuffle

# pylint: disable-next=pointless-string-statement
"""
This experiment demonstrates doing things with the User-Defined Constants field.

For User-Defined Constants the user can copy and paste a .ini config file's content into the text area
and that will be appended onto the config files the system generates.
Note: this information is never validated so be careful it is inputted correctly

Example settings for a run that demonstrates this:

Info:
If you want a collection of each CSV this experiment runs:
    Result Output: AddNumResult.csv
If you want the information from each CSV to be included in the resultCsv
    File Output: AddNumResult.csv
Both can be used at the same time

Parameters:
x, default: 1, min: 1, max: 10, step: 1
y, default: 1, min: 1, max: 10, step: 1

Paste into the User-Defined Contants field:

[const]
a = -1
;test comment
b = 10.5
invert = False
[Strings]
c = Test String
"""


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
