import configparser
import sys
from numpy import random
import argparse

parser = argparse.ArgumentParser(description="Run test script for the GLADOS System for a variance calculation.\nGenerates random numbers using python, and populates config file for an executable.")
parser.add_argument('--N', dest='count',type=int,help='Number of values generated randomly')
parser.add_argument('--override', dest='override',default=False, help="Override existing config.ini")

def main():
    args = parser.parse_args()
    number = args.count

    print(f'Generating random numbers from input.')
    values = generate_conf(number)
    print(f'Data generation complete. Config file written to ./config.ini')
    

     



def generate_conf(number : int):
    vals = random.random(number)
    print(f'Placing random numbers into config.ini if file does not exist.')
    try:
        f = open('config.init','x')
        f.write(f'[DEFAULT]\nnums=[{",".join(map(str,vals))}]')
    except Exception as e:
        print(f'FATALi {err=}, {type(err)}=')



if __name__=="__main__":
    main()
