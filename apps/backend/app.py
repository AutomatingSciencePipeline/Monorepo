
import os
import shutil
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
import magic

ENV_FIREBASE_CREDENTIALS = "FIREBASE_CREDENTIALS"

FIREBASE_CREDENTIALS = os.environ.get(ENV_FIREBASE_CREDENTIALS)
if FIREBASE_CREDENTIALS is None:
    raise AssertionError(
        f"Missing environment variable {ENV_FIREBASE_CREDENTIALS}, do you have an env file set up?")

#Firebase Objects
firebaseCredentials = credentials.Certificate(json.loads(FIREBASE_CREDENTIALS))
firebaseApp = firebase_admin.initialize_app(firebaseCredentials)
firebaseDb = firestore.client()
firebaseBucket = storage.bucket("gladosbase.appspot.com")

#setting up the app
flaskApp = Flask(__name__)
CORS(flaskApp)

#Constants
DEFAULT_STEP_INT = 1
DEFAULT_STEP_FLOAT = 0.1

### I'm bad at remembering print so I'm making a helper function
def log(toLog):
    print(toLog)

### FLASK API ENDPOINT
runner = ProcessPoolExecutor(1)
@flaskApp.post("/experiment")
def recv_experiment():
    runner.submit(run_batch,request.get_json())
    return 'OK'

def run_batch(data):
    time.sleep(1)
    print(data)
    experiments = firebaseDb.collection('Experiments')

    #Parsing the argument data
    id = data['experiment']['id']
    print(f'recieved {id}')
    expRef = experiments.document(id)
    experiment = expRef.get().to_dict()
    experiment['id'] = id
    experimentOutput = experiment['fileOutput']
    resultOutput = experiment['resultOutput']
    print(f"Experiment info {experiment}")

    #Downloading Experiment File
    os.makedirs(f'ExperimentFiles/{id}')
    os.chdir(f'ExperimentFiles/{id}')
    if experimentOutput != '':
        print('There will be experiment outputs')
        os.makedirs('ResCsvs')
    print(f'Downloading file for {id}')
    try:
        filepath = experiment['file']
    except Exception as err:
        filepath = f'experiment{id}'
        print(err)
    print(f"downloading {filepath} to ExperimentFiles/{id}/{filepath}")
    try:
        filedata = firebaseBucket.blob(filepath)
        filedata.download_to_filename(filepath)
    except Exception as err:
        print(f'Ran into {err} while trying to download experiment')

    #Deterimining FileType
    rawfiletype = magic.from_file(filepath)
    if(rawfiletype.__contains__('Python script')):
         filetype = 'python'
    elif(rawfiletype.__contains__('Java archive data (JAR)')):
        filetype = 'java'

    print(f"Raw Filetype: {rawfiletype}\n Filtered Filetype: {filetype}")


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
        firstRun = run_experiment(filepath,f'configFiles/{0}.ini',filetype)
        if resultOutput == '': 
            writer.writerow(["Experiment Run", "Result"] + paramNames)
        else:
            writer.writerow(["Experiment Run"] + get_header_results(resultOutput) + paramNames)
        if firstRun == "ERROR":
            writer.writerow([0,"Error"])
            print(f"Experiment {id} ran into an error while running aborting")
            fails += 1
        elif expToRun > 0:
            print(f"result from running first experiment: {firstRun}\n Continuing now running {expToRun}")
            if experimentOutput != '':
                add_to_batch(experimentOutput, 0)
                firstRun = "In ResCsvs"
            if resultOutput == '':
                writer.writerow(["0",firstRun] + get_configs_ordered(f'configFiles/{0}.ini',paramNames))
            else:
                writer.writerow(["0"] + get_output_results(resultOutput) + get_configs_ordered(f'configFiles/{0}.ini',paramNames))
            for i in range(1,expToRun+1):
                res = run_experiment(filepath,f'configFiles/{i}.ini',filetype)
                if experimentOutput != '':
                    res = 'In ResCsvs'
                    add_to_batch(experimentOutput, i)
                if resultOutput == '':
                    writer.writerow([i, res] + get_configs_ordered(f'configFiles/{i}.ini',paramNames))
                else:
                    writer.writerow([i] + get_output_results(resultOutput) + get_configs_ordered(f'configFiles/{i}.ini',paramNames))
                if res != "ERROR":
                    passes +=1
                else:
                    fails +=1
        passes += 1
        print(f"Finished running Experiments")

    #Uploading Experiment Results
    print(f'Uploading Results to the frontend')
    upblob = firebaseBucket.blob(f"results/result{id}.csv")
    upblob.upload_from_filename('results.csv')

    if experimentOutput != '':
        print('Uploading Result Csvs')
        try:
            shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')
            upblob = firebaseBucket.blob(f"results/result{id}.zip")
            upblob.upload_from_filename('ResultCsvs.zip')
        except Exception as err:
            print(err)

    #Updating Firebase Object
    expRef.update({'finished':True,'passes':passes,'fails':fails})
    print(f'Exiting experiment {id}')
    os.chdir('../..')

### UTILS
def run_experiment(experiment_path, config_path, filetype):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    if filetype == 'python':
        with Popen(['python',experiment_path,config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
            return get_data(p)
    elif filetype == 'java':
        with Popen(['java','-jar',experiment_path,config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
            return get_data(p)
     
def get_header_results(filename):
    with open(filename, mode = 'r') as file:
        reader = csv.reader(file)
        for line in reader:
            return line

def get_output_results(filename):
    with open(filename, mode = 'r') as file:
        reader = csv.reader(file)
        i = 0
        for line in reader:
            if i == 1:
                return line
            i += 1

def get_data(p):
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

def add_to_batch(fileOutput, ExpRun):
    try:
        shutil.copy2(f'{fileOutput}', f'ResCsvs/Result{ExpRun}.csv')
    except Exception as err:
        print(err)

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
        step = DEFAULT_STEP_INT if otherVar['step'] == '' or int(otherVar['step']) == 0 else otherVar['step']
        if otherVar['max'] == otherVar['min']:
            otherVar['max'] = int(otherVar['max']) + int(step)
        paramspos.append([(otherVar['name'],i) for i in range(int(otherVar['min']),int(otherVar['max']),int(step))])
    elif otherVar['type'] == 'float':
        step = DEFAULT_STEP_FLOAT if otherVar['step'] == '' or float(otherVar['step']) == 0 else otherVar['step']
        if otherVar['max'] == otherVar['min']:
             otherVar['max'] = float(otherVar['max']) + float(step)
        paramspos.append([(otherVar['name'],i) for i in frange(float(otherVar['min']),float(otherVar['max']),float(step))])
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
        try:
            if (param['type'] =='integer' or param['type'] == 'float') and param['min'] == param['max']:
                print('param ' + param['name'] + ' has the same min and max value converting to constant')
                consts[param['name']] = param['min']
            elif param['type'] == 'string':
                print('param ' + param['name'] + ' is a string, adding to constants')
                consts[param['name']] = param['default']
            else:
                print('param ' + param['name'] + ' varies, adding to batch')
                params.append(param)
        except Exception as err:
            print(f'{err} during finding constants')

    for defaultVar in params:
        print(f'Keeping {defaultVar} constant')
        try:
            paramspos = []
            default = [(defaultVar['name'],defaultVar['default'])]
            paramspos.append(default)
        except Exception as err:
            print(f"huh? {err}")
        for otherVar in hyperparams:
            if otherVar['name'] != defaultVar['name']:
                try:
                    gen_list(otherVar,paramspos)
                except Exception as err:
                    print(f'error {err} during list generation')
        try:
            perms = list(itertools.product(*paramspos))
        except Exception as err:
            print(f"Error {err} while making permutations")
        for perm in perms:
            config = configparser.ConfigParser()
            config.optionxform = str
            res = {}
            for var in perm:
                res[var[0]] = var[1]
            for var in consts.keys():
                res[var] = consts[var]
            config["DEFAULT"] = res
            with open(f'{configNum}.ini', 'w') as configFile:
                config.write(configFile)
                configFile.close()
                print(f"Finished writing config {configNum}")
            configNum += 1
    os.chdir('..')
    print("Finished generating configs")
    return configNum - 1

if __name__=='__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
