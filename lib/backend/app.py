
import sys, os, stat
import shutil

import re
from subprocess import Popen, PIPE, STDOUT
import select
import logging
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import collections
import itertools
import csv
import copy
import json
import argparse
import stat
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
# parser = argparse.ArgumentParser(description="Initialize GLADOS Global Load Balancer.")
# parser.add_argument('--N', dest='nworkers',type=int,help='Number of thread / process workers to use.')

app = Flask(__name__)

app.config['DEBUG'] = True
CORS(app)

### FLASK API ENDPOINTS

@app.post("/experiment")
def recv_experiment():
    exp = request.get_json()
    exp = proc_msg(exp)
    GlobalLoadBalancer.submit_experiment(exp)
    return 'OK'

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
        dataUPD = supabase.table("experiments").update({"status": "COMPLETE"}).eq("id", id).execute()
        self.e_status[id] = status
GlobalLoadBalancer = GLB(1)        


def experiment_event(msg):
    params = msg
    # within each experiment, we use threads
    # if not os.path.exists(params['fileName']):
    #     raise
    data = supabase.table("experiments").select("*").eq("id", params).execute();
    dataUPD = supabase.table("experiments").update({"status": "DISPATCHED"}).eq("id", data['id']).execute()
    os.chmod(f'GLADOS_HOME/incoming/{data["fileName"]}', 0o777)
    os.mkdir(f'GLADOS_HOME/exps/{data["id"]}')
    shutil.move(f'GLADOS_HOME/incoming/{data["fileName"]}', f'GLADOS_HOME/exps/{data["id"]}/{data["fileName"]}')
    os.chdir(f'GLADOS_HOME/exps/{data["id"]}')
    parameters = json.loads(data['parameters'])
    param_iter = gen_configs(parameters)
    totalExp = len(list(param_iter))
    ## we submit experiment configuration writing to a thread pool if verbose
    if data['verbose']:
        os.mkdir('configs')
        with ThreadPoolExecutor(data['n_workers']) as e:
            e.submit(write_configs, param_iter, [obs['paramName'] for obs in data['parameters']])
    
    ## process stuff and make API call to inform of the experiment's commencement
    results = []
    dead = 0
    i = 0
    cp = int(totalExp *.1)
    percent = 0
    dataUPD = supabase.table("experiments").update({"status": "RUNNING"}).eq("id", data['id']).execute()
    with ThreadPoolExecutor(data["n_workers"]) as executor:
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
    
    ## process stuff and make API call to inform of the experiment's completion
    ### write results to a csv file named experiment_id.csv
    dataUPD = supabase.table("experiments").update({"progress": 100, "percent_success": percent_success, "percent_fail" : percent_fail}).eq("id", data['id']).execute()
    with open(f'result.csv', 'w') as csvfile:
        header = ['iter']
        header += [k['paramName'] for k in params['parameters']]
        header.append('result')
        writer = csv.writer(csvfile)
        writer.writerow(header)
        # print(results)
        writer.writerows(list(map(lambda x: post(x), results)))

    
    return params['id'],1.-float(dead)/len(results),results

def post(s):
    s = list(s.values())
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
    #try: 
    #   return params['iter'], list(params['params']), [params['func'](*params['params'])]
    #except Exception as e:
    #   raise Exception(f'Mapper failed with exception: {e} for the iteration with params', params['iter'], params['params'])
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

def gen_configs(hyperparams):
    ### Generate hyperparameter configurations

    params_raw = []
    temp = []
    for param in hyperparams:
        if param['type'] == "integer" or param['type'] == "float":
            for param2 in hyperparams:
                if not param['paramName'] == param2["paramName"]:
                    if param2['type'] == "float" or param2['type'] == "integer":
                        temp.append([param2['values'][0]])
                    elif param2['type'] == "array":
                        temp.append(param2['value'])
                    elif param2['type'] == "boolean":
                        if param2['value']:
                            temp.append([True])
                        else:
                            temp.append([''])
                else:
                    temp.append(np.arange(param['values'][1],param['values'][2]+param['values'][3],param['values'][3]))
            concat_arrays(params_raw, list(itertools.product(*temp)))
            temp = []
        elif param['type'] == "array":
            for param2 in hyperparams:
                if not param['paramName'] == param2["paramName"]:
                    if param2['type'] == "float" or param2['type'] == "integer":
                        temp.append([param2['values'][0]])
                    elif param2['type'] == "array":
                        temp.append(param2['value'])
                    elif param2['type'] == "boolean":
                        if param2['value']:
                            temp.append([True])
                        else:
                            temp.append([False])
                else:
                    temp.append(param2['value'])
            concat_arrays(params_raw, list(itertools.product(*temp)))
            temp = []

    # params_raw = [k['values'] for k in hyperparams]
    # params_raw = [[x for x in np.arange(k[0],k[1]+k[2],k[2])] for k in params_raw
    app.logger.info(f'DEBUG: params_raw is equal to {params_raw}')
    return enumerate(list(params_raw))
def concat_arrays(arr1, arr2):
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
    ## for now, this function is hardcoding some things, but it's no biggie
    rm = copy.deepcopy(msg)
    for obj in rm['parameters']:
        if obj['type'] == "integer" or obj['type'] == "float":
            obj['values'] = [float(x) for x in obj['values']]
            obj['values'] = [x for i,x in enumerate(obj['values']) if i >= 0]
        elif obj['type'] == "array":
            obj['value'] = [float(x) for x in obj['value']]
            obj['value'] = [x for i,x in enumerate(obj['value']) if i >= 0]
        elif obj['type'] == "boolean":
            obj['value'] = bool(obj['value'])

    rm['id'] = rm['experimentName']
    del rm['experimentName']
    return rm

def np_uncode(x):
    if isinstance(x,np.integer):
        return int(x)
    if isinstance(x,np.floating):
        return float(x)



def flatten(x):
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
    logging.getLogger().setLevel(logging.DEBUG)
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


