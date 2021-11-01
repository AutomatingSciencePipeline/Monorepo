import sys
import subprocess

def read_input(file):
    for line in file:
        yield line.rstrip()


input = read_input(sys.stdin)
input = [line for line in input]

subprocess.run(input[0] + ' services/confparse/config.ini')

f = open('results.csv', 'r')
results = f.read().splitlines()
f.close()
print(f'{results[0]}\t{results[1]}')
sys.stderr.write("report: still alive")
