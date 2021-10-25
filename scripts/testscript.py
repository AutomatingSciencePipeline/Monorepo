import sys, os
from subprocess import Popen, PIPE, STDOUT
from numpy import random
import argparse,configparser,json

parser = argparse.ArgumentParser(description="Run test script for the GLADOS System for a variance calculation.\nGenerates random numbers using python, and populates config file for an executable.")
parser.add_argument('--N', dest='count',type=int,help='Number of values generated randomly')
parser.add_argument('--override', dest='override',default=False, help="Override existing config.ini")

config = configparser.ConfigParser()
config.sections()

def main():
    args = parser.parse_args()
    number = args.count
    override = not not args.override

    print(f'Generating random numbers from input.')
    generate_conf(number,override)
    print(f'Data generation complete. Config file written to ./config.ini\nReading from config.ini')
    config.read('config.init')
    values = map(float,json.loads(config.get("DEFAULT","nums")))
    print(f'Feeding generated data into test mapping script.')
    payload = '\n'.join('{}'.format(i) for i in values)
    print(f'Payload as follows:\n{payload}')
    print('Opening subprocess')

    with Popen(['python','varmeanmapper.py'], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
        try:
            stdout_data = p.communicate(input=payload)
            print(stdout_data)
        except Exception as e:
            print('FATAL')
            print(e)
            exit()

    data = stdout_data[0]
     





def generate_conf(number : int, ov : bool):
    vals = random.random(number)
    print(f'Placing random numbers into config.ini if file does not exist.')
    try:
        f = open('config.init','x')
        f.write(f'[DEFAULT]\nnums=[{",".join(map(str,vals))}]')
    except Exception as e:
        if not ov:
            print(f'FATALi {e=}, {type(e)}=')
            exit()
        else:
            os.remove('config.init')
            return generate_conf(number,False)


if __name__=="__main__":
    main()
