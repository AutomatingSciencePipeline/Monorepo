import sys, os
import re
from subprocess import Popen, PIPE, STDOUT
from numpy import random
import argparse,configparser,json

parser = argparse.ArgumentParser(description="Run test script for the GLADOS System for a variance calculation.\nGenerates random numbers using python, and populates config file for an executable.")
parser.add_argument('--N', dest='count',type=int,help='Number of values generated randomly')
parser.add_argument('--nitr', dest='itercount',type=int,help='Number of mapper iterations to perform for reduction')
parser.add_argument('--override', dest='override',default=False, help="Override existing config.ini")
parser.add_argument('--clean',dest='clean',default=False,help="clean existing configs for jobs")

config = configparser.ConfigParser()
config.sections()

def main():
    args = parser.parse_args()
    number = args.count
    itrcount = args.itercount
    override = not not args.override
    clean = not not args.clean

    if clean:
        files = os.listdir()
        files = [file for file in files if re.search("\.init$", file)]
        try:
            for file in files: os.remove(file)
        except Exception as e:
            print('FATAL')
            print(e)
            exit()
        print(files)
        exit()

    print(f'Generating random numbers from input.')
    if itrcount:
        for i in range(itrcount):
            generate_conf(number,override,i)
    else:
        generate_conf(number,override,i)

    print(f'Data generation complete. Config file/s written to ./config(rangeof itercount).ini\nReading from config.ini')
    vvalues = [read_conf(value) for value in range(itrcount)]
    payloads = ['\n'.join('{}'.format(i) for i in values) for values in vvalues]
    mapper_outs = [communicate('varmeanmapper.py', payload) for payload in payloads]
    print(f'Communications complete, initiated pipes with {len(payloads)} processes and gathered outputs for reduction successfully.')

    reduce_in = ''.join(mapper_outs)
    reducer_out = communicate('varmeanreducer.py',reduce_in)

def read_conf(itr : int) -> list[float]:
    config.read(f'config{itr}.init')
    return list(map(float,json.loads(config.get("DEFAULT","nums"))))
     
def generate_conf(number : int, ov : bool, itr : int) -> type(None):
    vals = random.random(number)
    print(f'Placing random numbers into config.ini if file does not exist.')
    try:
        f = open(f'config{itr}.init','x')
        f.write(f'[DEFAULT]\nnums=[{",".join(map(str,vals))}]')
    except Exception as e:
        if not ov:
            print(f'FATALi {e=}, {type(e)}=')
            exit()
        else:
            os.remove('config.init')
            return generate_conf(number,False)

def communicate(process:str, payload: list[str]) -> list[str]:
    print(f'initiating communication and process at {process}')
    with Popen(['python',process], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
        try:
            stdout_data = p.communicate(input=payload)
            print(f'data returned from pipe is {stdout_data[0]}')
            if not stdout_data[1]:
                print(f'errors returned from pipe is {stdout_data[1]}')
        except Exception as e:
            print('FATAL')
            print(e)
            exit()

    return stdout_data[0] if stdout_data else None


if __name__=="__main__":
    main()
