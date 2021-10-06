import subprocess

#this program will recieve the experiment file and config files from the front end, then run the experiment and return the results to the database

expName = 'add_nums'
configName = 'config.ini'
subprocess.run(expName + ' ' + configName)


