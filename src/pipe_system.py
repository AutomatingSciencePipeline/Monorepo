import configparser
import subprocess

expName = 'add_nums'
configName = 'config.ini'
config = configparser.ConfigParser()
config.read(configName)

subprocess.run([expName, config['DEFAULT']['Variable1'], config['DEFAULT']['Variable2']])

