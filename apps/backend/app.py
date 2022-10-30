
from distutils.command.config import config
import sys, os, stat
import shutil

import re
from subprocess import Popen, PIPE, STDOUT
import select
import logging
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from typing_extensions import assert_type
from flask import Flask, jsonify, request
from flask_cors import CORS
from httpx import get
import numpy as np
import collections
import itertools
import csv
import copy
import json
import argparse
import stat
from supabase import create_client, Client

import time
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
import configparser
cred = credentials.Certificate(json.loads(os.environ.get("creds")))

app = firebase_admin.initialize_app(cred)

db = firestore.client()
bucket = storage.bucket("gladosbase.appspot.com")

url: str = os.environ.get("SUPA_URL")
key: str = os.environ.get("ANON_KEY")
supabase = create_client(url, key)


# random_email: str = "3hf82fijf92@supamail.com"
# random_password: str = "fqj13bnf2hiu23h"
# user = supabase.auth.sign_in(email=random_email, password=random_password) help

# parser = argparse.ArgumentParser(description="Initialize GLADOS Global Load Balancer.")
# parser.add_argument('--N', dest='nworkers',type=int,help='Number of thread / process workers to use.')

app = Flask(__name__)

app.config['DEBUG'] = True
CORS(app)

### I'm bad at remembering app.logger.info so I'm making a helper function

def log(toLog):
    app.logger.info(toLog)

### FLASK API ENDPOINTS


class DEBUG: 
    def __init__(self):
        self.i = 0
        
    def __call__(self, arg=None):
        if not arg: 
            print(f'CHECKPOINT {self.i}')
        else: 
            print(f'CHECKPOINT {self.i}: {arg}')
        self.i = self.i + 1

debugger = DEBUG()
debugger()

runner = ProcessPoolExecutor(1)

@app.post("/experiment")
def recv_experiment():
    runner.submit(run_batch,request.get_json())
    # res = proc_msg(experiment)
    # log(gen_configs(res['params']))
    # exp = request.get_json()
    # app.logger.info(f'[EXP RECEIVED]:\tExperiment {exp} received.')
    # exp = proc_msg(exp)
    # GlobalLoadBalancer.submit_experiment(exp)
    return 'OK'

def run_batch(data):
    time.sleep(1)
    app.logger.info(data)
    experiments = db.collection('Experiments')

    id = data['experiment']['id']
    app.logger.info(f'recieved {id}')
    expRef = experiments.document(id)
    experiment = expRef.get().to_dict()
    experiment['id'] = id
    app.logger.info(f"Experiment info {experiment}")

    os.makedirs(f'ExperimentFiles/{id}')
    os.chdir(f'ExperimentFiles/{id}')
    app.logger.info(f'Downloading file for {id}')
    filepath = experiment['file']
    app.logger.info(f"downloading {filepath} to ExperimentFiles/{id}/{filepath}")
    filedata = bucket.blob(filepath)
    filedata.download_to_filename(filepath)

    app.logger.info(f"Generating configs and downloading to ExperimentFiles/{id}/configFiles")
    expToRun = gen_configs(json.loads(experiment['params'])['params']) 
    app.logger.info(f"Running Experiment {id}")
    passes = 0
    fails = 0
    with open('results.csv', 'w') as expResults:
        paramNames = get_config_paramNames('configFiles/0.ini')
        writer = csv.writer(expResults)
        writer.writerow(["Experiment Run", "Result"] + paramNames)
        firstRun = run_experiment(filepath,f'configFiles/{0}.ini')
        if firstRun == "ERROR":
            writer.writerow([0,"Error"])
            app.logger.info("Experiment {id} ran into an error while running aborting")
        else:
            app.logger.info(f"result from running first experiment: {firstRun}\n Continuing now running {expToRun-1}")
            writer.writerow(["0",firstRun] + get_configs_ordered(f'configFiles/{0}.ini',paramNames))
            for i in range(1,expToRun):
                writer.writerow([i, res:= run_experiment(filepath,f'configFiles/{i}.ini')] + get_configs_ordered(f'configFiles/{i}.ini',paramNames))
                if res != "ERROR":
                    passes +=1
                else:
                    fails +=1
            app.logger.info(f"Finished running Experiments")

    app.logger.info(f'Uploading Results to the frontend')
    upblob = bucket.blob(f"results/result{id}.csv")
    upblob.upload_from_filename('results.csv')

    expRef.update({'finished':True,'passes':passes,'fails':fails})
    app.logger.info(f'Exiting experiment {id}')
    os.chdir('../..')

### GLB
class GLB(object):

    def __init__(self, n_workers=1):
        self.e_status = {}
        self.e = ProcessPoolExecutor(n_workers)
        self.f = ThreadPoolExecutor(n_workers)
        logging.debug(f'GLB: {n_workers} workers initialized. Awaiting requests...')
        
    def submit_experiment(self, msg):
        self.e_status[msg['id']] = 'INIT'
        logging.info(f'Experiment {msg["id"]} by {msg["user"]} submitted.')
        self.e.submit(experiment_event, msg).add_done_callback(experiment_resolve)
        
    
    def update_experiment_status(self, id, status):
        self.e_status[id] = status
GlobalLoadBalancer = GLB(1)        


# def write_binary()

def experiment_event(msg):
    data = msg
    dataUPD = supabase.table("experiments").update({"status": "DISPATCHED"}).eq("id", data['id']).execute()

    path = data['key']
    binary = supabase.storage().from_('experiment_files').download(path[path.find('/')+1:])

    os.mkdir(f'GLADOS_HOME/exps/{data["id"]}')
    os.chdir(f'GLADOS_HOME/exps/{data["id"]}')
    
    data["fileName"] = data['key'].split('/')[-1]

    with open(data["fileName"], 'wb') as f:
        f.write(binary)
    
    os.chmod(f'{data["fileName"]}', 0o777)

    # shutil.move(f'GLADOS_HOME/incoming/{data["fileName"]}', f'GLADOS_HOME/exps/{data["id"]}/{data["fileName"]}')
    parameters = data['params']
    # parameters = json.loads(data[''])
    param_iter = gen_configs(parameters)
    # debugger('PARAM_ITER')
    totalExp = len(list(copy.deepcopy(param_iter)))
    # debugger(list(param_iter))
    ## we submit experiment configuration writing to a thread pool if verbose
    if data['verbose']:
        os.mkdir('configs')
        with ThreadPoolExecutor(1) as e:
            e.submit(write_configs, param_iter, [obs['paramName'] for obs in data['params']])
    
    ## process stuff and make API call to inform of the experiment's commencement
    results = []
    dead = 0
    i = 0
    cp = int(totalExp *.1)
    percent = 0
    dataUPD = supabase.table("experiments").update({"status": "RUNNING"}).eq("id", data['id']).execute()
    percent_fail = 0
    percent_success = 0
    
    debugger()
    
    with ThreadPoolExecutor(1) as executor:
        result_futures = list(map(lambda x: executor.submit(mapper, {'filename': data['fileName'],'iter':x[0],'params':x[1]}), list(param_iter)))
        for future in as_completed(result_futures):
            try:
                res = future.result()
                results.append({'iter': res[0], 'params': res[1], 'result': res[2]})
                if i % 10 == 0:
                    logging.info(f'{i} iterations completed.')
            except Exception as e:
                ### write temporary state of problems
                print(e)
                results.append({'iter': 0, 'params': [0], 'result': 'FAILED'})
                dead+=1
            i+=1
            if(i % cp == 0):
                percent += 10
                percent_success = int(((i-dead)/totalExp)*100)
                percent_fail = int((dead/totalExp)*100)
                dataUPD = supabase.table("experiments").update({"progress": percent, "percent_success": percent_success, "percent_fail" : percent_fail}).eq("id", data['id']).execute()
    
    dataUPD = supabase.table("experiments").update({"progress": 100, "percent_success": percent_success, "percent_fail" : percent_fail, "status": "COMPLETE"}).eq("id", data['id']).execute()
    # assert len(dataUPD) > 0, "Experiment not found."
    with open(f'result.csv', 'w') as csvfile:
        header = ['iter']
        header += [k['paramName'] for k in data['params']]
        header.append('result')
        writer = csv.writer(csvfile)
        writer.writerow(header)
        writer.writerows(list(map(lambda x: post(x), results)))    
    
    dest = '/'.join([*data['key'].split('/')[1:-1],'result.csv'])
    response = supabase.storage().from_('experiment_files').upload(dest, 'result.csv')
    os.chdir('../../..')
    return data['id'],(1.-float(dead)/len(results) if len(results) > 0 else 0.),results


def post(s):
    s = list(s.values())

    debugger(s)
    s = [s[0]] + s[1] + [s[2]]
    return s

def experiment_resolve(future):
    ### Make API call to inform of completion of experiment
    # if future.exception():
        
    id, prog, results = future.result()
    GlobalLoadBalancer.update_experiment_status(id, 'DONE')
    app.logger.info(f'[EXP COMPLETE]:\tExperiment {id} completed with {prog} success rate.')
    app.logger.info(f'THIS IS A DEBUG MESSAGE. CURRENT PATH IS{os.getcwd()}')

def mapper(params):
    debugger('MAPPER')
    debugger(params)
    try:
        #print(params['params'])
        file = params["filename"]
        fileMod = file[0:len(file)-5]
        app.logger.info(f'the last 4 digits are {file[len(file)-5:len(file)]}')
        #runs jar files (not working)
        if(file[len(file)-5:len(file)] == ".java"):
            os.system(f'javac {file}')
            result = communicate(f'java {fileMod}', list(map(str, list(params['params']))))
        #runs python files
        else:
            result = communicate(f'./{file}', list(map(str, list(params['params']))))
    except Exception as e:
        raise Exception(f'Mapper failed with exception: {e} for the')
    return params['iter'], list(params['params']), result
    
    

### UTILS
def run_experiment(experiment_path, config_path):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    # app.logger.info(f"Current directory {os.getcwd()}")
    with Popen(["python",experiment_path,config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
        try:
            data = p.communicate()
            if data[1]:
                app.logger.info(f'errors returned from pipe is {data[1]}')
                return "ERROR"
        except Exception as e:
            app.logger.info(e)
            return "ERROR"
        result = data[0].split('\n')[0]
        app.logger.info(f"result data: {result}")
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
    for defaultVar in hyperparams:
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
            config['DEFAULT'] = res
            with open(f'{configNum}.ini', 'w') as configFile:
                config.write(configFile)
                configFile.close()
            configNum += 1
    os.chdir('..')
    return configNum - 1


def concat_arrays(arr1, arr2): #test 
    for x in arr2:
        arr1.append(x)

def write_configs(raw, headers):
    dicts = []
    for _,x in copy.deepcopy(raw):
        temp = {}
        for i in range(len(x)):
            temp[headers[i]] = x[i]
        dicts.append(temp)
    jsons = [json.dumps(x) for x in dicts]
    for i,_ in copy.deepcopy(raw):
        with open(f'configs/config_{i}.json', 'w+') as f:
            f.write(jsons[i])
        

def proc_msg(msg):

    id = msg["id"]
    filepath = msg['file']

    rm = json.loads(msg['params'])
    for obj in rm['params']:
        if obj['type'] == "integer" or obj['type'] == "float":
            obj['values'] = [float(x) for x in [obj['default'],obj['min'], obj['max'], obj['step']]]
            obj['values'] = [x for i,x in enumerate(obj['values']) if i >= 0]
        elif obj['type'] == "array":
            obj['value'] = [float(x) for x in obj['value']]
            obj['value'] = [x for i,x in enumerate(obj['value']) if i >= 0]
        elif obj['type'] == "bool":
            obj['value'] = bool(obj['default'])
        obj['paramName'] = obj['name']
    rm['user'] = msg['creator']
    rm['id'] = msg['id']
    rm['key'] = key
    rm['verbose'] = msg['verbose']

    log(rm)
    # debugger(rm)
    return rm

def np_uncode(x): #test 
    if isinstance(x,np.integer):
        return int(x)
    if isinstance(x,np.floating):
        return float(x)



def flatten(x): #test right now 
    if isinstance(x, collections.Iterable):
        return [a for i in x for a in flatten(i)]
    else:
        return [x]

def initilize_work_space():
    # names = ['exps','res','incoming']
    # if not os.path.exists('GLADOS_HOME'):
    #     os.mkdir('/appdata/GLADOS_HOME')
    # for name in names:
    #     if not os.path.exists(f'/appdata/GLADOS_HOME/{name}'):
    #         os.mkdir(f'/appdata/GLADOS_HOME/{name}')
    os.chdir('/app/GLADOS_HOME')


def communicate(process, payload):
    with Popen([process] + payload, stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
        try:
            stdout_data = p.communicate()
            #if not stdout_data:
            #    raise UnresponsiveBinaryException(f'{process} is unresponsive.')
            if stdout_data[1]:
                print(f'errors returned from pipe is {stdout_data[1]}')
                raise FailedIterationException(f'Iteration has failed with error {stdout_data[1]}')
        except Exception as e:
            raise PipeFailureException(f'Error communicating with process: {e}')
    return float(stdout_data[0])

### TYPES 
class FailedIterationException(Exception):
    pass

class PipeFailureException(Exception):
    pass

class UnresponsiveBinaryException(Exception):
    pass

### EXPERIMENTAL ARTIFACTS


if __name__=='__main__':
    logging.getLogger().setLevel(logging.INFO)
    initilize_work_space()
    # hyperparams = [{'paramName':'x','values':[0,10,0.1]},{'paramName':'y','values':[5,100,5]}]
    # msg_test = {
    #     'id' : 'XVZ01',
    #     'user' : 'elijah',
    #     'func' : add_nums,
    #     'hyperparams' : hyperparams
    # }
    # GlobalLoadBalancer.submit_experiment(msg_test)
    app.run(debug = True)
    #blablabla = gen_configs(msg_test['hyperparams'])
    #write_configs(blablabla, [obs['paramName'] for obs in msg_test['hyperparams']])
    #communicate('./add_nums.py', ['1','2'])
    
'''
### plot postprocessing / native support ###
### gen intermediate plots live ###
### [debug mode]: switch to not write configuration
### intermediate checks: every n iterations, restrict param space based on provided code
### MPI

1. refined front-end >> integrate with the db and crud 
2.  > modularity:
    > distribution across the network >> MPI 
3. stitch the system together

'''


