import sys
import os

def read_input(file):
    for line in file:
        yield line.rstrip()
        
input = read_input(sys.stdin)
mapperOut = [line.split('\t') for line in input]
f = open("finalresults.csv", "a")


if os.stat("finalresults.csv").st_size == 0:
    f.write(mapperOut[0][0] + "\n")

for instance in mapperOut:
    for number in instance[1:]:
        f.write(number + "\n")

f.close()

sys.stderr.write("report: still alive")
