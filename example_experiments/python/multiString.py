import configparser
import sys
import csv

def main():
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    x = int(config["DEFAULT"]["x"])
    values = config["DEFAULT"]["values"]
    combined = f"{x}{values}"
    
    with open('stringResult.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['Combined'])
        writer.writerow([combined])

    print("done")
    return 0

if __name__ == "__main__":
    main()