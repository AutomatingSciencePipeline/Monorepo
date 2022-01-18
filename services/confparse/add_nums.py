#!/bin/python3


import configparser
import sys

#basic "experiment" for testing the experimental pipeline. parses config file for two variables, adds them, and outputs a csv with the two variables and their sum

config = configparser.ConfigParser()
config.sections()

def parse_configuration(filename):
    config.read(filename)

    var1 = int(config['DEFAULT']['var1'])
    var2 = int(config['DEFAULT']['var2'])
    run_experiment(var1, var2)


def run_experiment(var1, var2):
    f = open("results.csv", "w")
    f.write("sum,var1,var2\n")
    varSum = str(var1 + var2)
    var1 = str(var1)
    var2 = str(var2)
    f.write(varSum + "," + var1 + "," + var2)
    f.close()


#take in from the commandline the path to the configuration file
filename = sys.argv[1]

#then pass that in to a function which reads out all required variables and runs experiment
parse_configuration(filename)




