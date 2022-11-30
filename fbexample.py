from genericpath import isdir
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
import itertools
import configparser
import os
import json
# cred = credentials.Certificate("Monorepo/creds.json")

# app = firebase_admin.initialize_app(cred)

# db = firestore.client()
# bucket = storage.bucket("gladosbase.appspot.com")
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
    config = configparser.ConfigParser()
    config.read('0.ini')
    res = [f' {key} = {config["DEFAULT"][key]} 'for key in config['DEFAULT'].keys()]

    x = {"1":2}
    try:
        temp = x['step']
    except:
        x['step'] = 1
        print(x)
    print(res)    