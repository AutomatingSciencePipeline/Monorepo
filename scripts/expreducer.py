import sys
from numpy import mat, mean, power

def read_input(file):
    for line in file:
        yield line.rstrip()
        
input = read_input(sys.stdin)
mapperOut = [line.split('\t') for line in input]
f = open("finalresults.csv", "w")

for instance in mapperOut:
    for number in instance:
        f.write(number + "\n")

f.close()

sys.stderr.write("report: still alive")
