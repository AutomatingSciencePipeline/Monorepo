
import os
from subprocess import Popen, PIPE, STDOUT
import logging
from concurrent.futures import ProcessPoolExecutor
from flask import Flask, request
from flask_cors import CORS
from httpx import get
import itertools
import csv
import json

import time
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
import configparser

#Firebase Objects
cred = credentials.Certificate(json.loads(os.environ.get("creds")))
app = firebase_admin.initialize_app(cred)
db = firestore.client()
bucket = storage.bucket("gladosbase.appspot.com")

#setting up the app
app = Flask(__name__)
CORS(app)

### I'm bad at remembering print so I'm making a helper function
def log(toLog):
    print(toLog)

### FLASK API ENDPOINT
runner = ProcessPoolExecutor(1)
@app.post("/experiment")
def recv_experiment():
    runner.submit(run_batch,request.get_json())
    return 'OK'

def run_batch(data):
    time.sleep(1)
    print(data)
    experiments = db.collection('Experiments')

    #Parsing the argument data
    id = data['experiment']['id']
    print(f'recieved {id}')
    expRef = experiments.document(id)
    experiment = expRef.get().to_dict()
    experiment['id'] = id
    print(f"Experiment info {experiment}")

    #Downloading Experiment File
    os.makedirs(f'ExperimentFiles/{id}')
    os.chdir(f'ExperimentFiles/{id}')
    print(f'Downloading file for {id}')
    filepath = experiment['file']
    print(f"downloading {filepath} to ExperimentFiles/{id}/{filepath}")
    filedata = bucket.blob(filepath)
    filedata.download_to_filename(filepath)

    #Generaing Configs from hyperparameters
    print(f"Generating configs and downloading to ExperimentFiles/{id}/configFiles")
    expToRun = gen_configs(json.loads(experiment['params'])['params']) 

    #Running the Experiment
    print(f"Running Experiment {id}")
    passes = 0
    fails = 0
    with open('results.csv', 'w') as expResults:
        paramNames = get_config_paramNames('configFiles/0.ini')
        writer = csv.writer(expResults)
        writer.writerow(["Experiment Run", "Result"] + paramNames)
        firstRun = run_experiment(filepath,f'configFiles/{0}.ini')
        if firstRun == "ERROR":
            writer.writerow([0,"Error"])
            print("Experiment {id} ran into an error while running aborting")
        elif expToRun-1 >= 0:
            print(f"result from running first experiment: {firstRun}\n Continuing now running {expToRun-1}")
            writer.writerow(["0",firstRun] + get_configs_ordered(f'configFiles/{0}.ini',paramNames))
            for i in range(1,expToRun):
                writer.writerow([i, res:= run_experiment(filepath,f'configFiles/{i}.ini')] + get_configs_ordered(f'configFiles/{i}.ini',paramNames))
                if res != "ERROR":
                    passes +=1
                else:
                    fails +=1
        print(f"Finished running Experiments")

    #Uploading Experiment Results
    print(f'Uploading Results to the frontend')
    upblob = bucket.blob(f"results/result{id}.csv")
    upblob.upload_from_filename('results.csv')

    #Updating Firebase Object
    expRef.update({'finished':True,'passes':passes,'fails':fails})
    print(f'Exiting experiment {id}')
    os.chdir('../..')

### UTILS
def run_experiment(experiment_path, config_path):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    # print(f"Current directory {os.getcwd()}")
    with Popen(["python",experiment_path,config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
        try:
            data = p.communicate()
            if data[1]:
                print(f'errors returned from pipe is {data[1]}')
                return "ERROR"
        except Exception as e:
            print(e)
            return "ERROR"
        result = data[0].split('\n')[0]
        print(f"result data: {result}")
        return(result)

def get_config_paramNames(configfile):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = [key for key in config['DEFAULT'].keys()]
    res.sort()
    return res

def get_configs_ordered(configfile,names):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = [config["DEFAULT"][key] for key in names]
    return res


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

def gen_list(otherVar, paramspos):
    if otherVar['type'] == 'integer':
        if otherVar['max'] == otherVar['min']:
            otherVar['max'] = int(otherVar['max']) + int(otherVar['step'])
        paramspos.append([(otherVar['name'],i) for i in range(int(otherVar['min']),int(otherVar['max']),int(otherVar['step']))])
    elif otherVar['type'] == 'float':
        if otherVar['max'] == otherVar['min']:
             otherVar['max'] = float(otherVar['max']) + float(otherVar['step'])
        paramspos.append([(otherVar['name'],i) for i in frange(float(otherVar['min']),float(otherVar['max']),float(otherVar['step']))])
    elif otherVar['type'] == 'string':
        paramspos.append([(otherVar['name'],otherVar['default'])])
    elif otherVar['type'] == 'bool':
        paramspos.append([(otherVar['name'],val) for val in [True,False]])

def gen_configs(hyperparams):
    os.mkdir('configFiles')
    os.chdir('configFiles')
    configNum = 0
    consts = {}
    params = []
    for param in hyperparams:
        if (param['type'] =='integer' or param['type'] == 'float') and param['min'] == param['max']:
            consts[param['name']] = param['min']
        else:
            params.append(param)

    for defaultVar in params:
        if defaultVar['type'] == 'string':
            continue
        paramspos = []
        default = [(defaultVar['name'],defaultVar['default'])]
        paramspos.append(default)
        for otherVar in hyperparams:
            if otherVar['name'] != defaultVar['name']:
                gen_list(otherVar,paramspos)
        perms = list(itertools.product(*paramspos))
        for perm in perms:
            config = configparser.ConfigParser()
            res = {}
            for var in perm:
                res[var[0]] = var[1]
            for var in consts.keys():
                res[var] = consts[var]
            config['DEFAULT'] = res
            with open(f'{configNum}.ini', 'w') as configFile:
                config.write(configFile)
                configFile.close()
            configNum += 1
    os.chdir('..')
    return configNum - 1

if __name__=='__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    app.run()
    


