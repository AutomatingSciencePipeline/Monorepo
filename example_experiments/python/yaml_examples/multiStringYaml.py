import csv
import sys
import yaml

# pylint: disable-next=pointless-string-statement
"""
This experiment demonstrates the default experiment multiString but with a yaml config file instead of an ini file. 
The same information is being gathered and outputted, just in a different format.

Example settings for a run that demonstrates this: (Any Fields not specified can be left blank or to whatever their default is)

Info:
ConfigFileFormat: yaml
Trial Result: stringResult.csv
If you want a collection of each CSV this experiment runs:
    Trial's Extra File: stringResult.csv
Both can be used at the same time

Parameters:
x, 1, 1, 10, 1
values, a, b
values2, one,two,three
"""

# pylint: disable=glados-print-used

def main():
    args = sys.argv[1:]
    configFile = args[0]
    with open(configFile, "r", encoding="utf8") as f:
        config = yaml.safe_load(f)
    x = int(config["x"])
    values = config["values"]
    values2 = config["values2"]
    combined = str(x) + values + values2
    with open('stringResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Combined'])
        writer.writerow([combined])

    print("done")
    return 0


if __name__ == "__main__":
    main()
