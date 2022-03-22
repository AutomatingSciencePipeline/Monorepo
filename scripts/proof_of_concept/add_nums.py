#!/usr/bin/env python3
import sys 

def main():
    args = sys.argv[1:]
    x = float(args[0])
    y = float(args[1])
    print(x+y)
    return 0


if __name__ == "__main__":
    main()