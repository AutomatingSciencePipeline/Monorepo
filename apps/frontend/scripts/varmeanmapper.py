import sys
from numpy import mat, mean, power

def read_input(file):
    for line in file:
        yield line.rstrip()


input = read_input(sys.stdin)
input = [float(line) for line in input]
numInputs = len(input)
input = mat(input)
sqInput = power(input,2)
print(f'')
print("number of inputs: " + str(numInputs)
    + ", mean of inputs: " + str(mean(input)) 
    + ", squared mean of inputs: " + str(mean(sqInput)))
print("report: still alive")
