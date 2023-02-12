from genericpath import isdir
import time
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
import itertools
import configparser
import os
import json

def frange(start, stop, step=None):
    if step == None:
        step = 1.0
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1



if __name__ == "__main__":
    print("Hello world")
