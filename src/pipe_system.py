import configparser
import subprocess
import json

#parses the config file sent by the front end and the enters variables as arguments to the "experiment" exe file sent

expName = 'add_nums'
configName = 'config.ini'
config = configparser.ConfigParser()
config.read(configName)
varList = config['VARIABLES']['VarList']
args = [expName]
args.extend(json.loads(varList))
args = map(str, args)

subprocess.run(args)


