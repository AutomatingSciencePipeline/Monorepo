
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
        self.e_status[id] = status
GlobalLoadBalancer = GLB(1)        


def experiment_event(msg):
    params = msg
    # within each experiment, we use threads
    # if not os.path.exists(params['fileName']):
    #     raise
    os.chmod(f'GLADOS_HOME/incoming/{params["fileName"]}', 0o777)
    os.mkdir(f'GLADOS_HOME/exps/{params["id"]}')
    shutil.move(f'GLADOS_HOME/incoming/{params["fileName"]}', f'GLADOS_HOME/exps/{params["id"]}/{params["fileName"]}')
    os.chdir(f'GLADOS_HOME/exps/{params["id"]}')
    param_iter = gen_configs(params['parameters'])
    ## we submit experiment configuration writing to a thread pool if verbose
    if params['verbose']:
        os.mkdir('configs')
        with ThreadPoolExecutor(1) as e:
            e.submit(write_configs, param_iter, [obs['paramName'] for obs in params['parameters']])
    
    ## process stuff and make API call to inform of the experiment's commencement
    results = []
    dead = 0
    i = 0
    with ThreadPoolExecutor(1) as executor:
        result_futures = list(map(lambda x: executor.submit(mapper, {'filename': params['fileName'],'iter':x[0],'params':x[1]}), list(param_iter)))
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
    
    ## process stuff and make API call to inform of the experiment's completion
    ### write results to a csv file named experiment_id.csv
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
    logging.info(f'[EXP COMPLETE]:\tExperiment {id} completed with {prog} success rate.')

def mapper(params):
    #try: 
    #   return params['iter'], list(params['params']), [params['func'](*params['params'])]
    #except Exception as e:
    #   raise Exception(f'Mapper failed with exception: {e} for the iteration with params', params['iter'], params['params'])
    try:
        #print(params['params'])
        result = communicate(f'./{params["filename"]}', list(map(str, list(params['params']))))
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
                        if param2['value'] == "True":
                            temp.append([True])
                        else:
                            temp.append([''])
                else:
                    temp.append(np.arange(param['values'][1],param['values'][2]+param['values'][3],param['values'][3]))
            app.logger.info(f'After integer, temp is {temp}')
            concat_arrays(params_raw, list(itertools.product(*temp)))
            app.logger.info(f'Params raw after integer is {params_raw}')
            temp = []
        elif param['type'] == "array":
            for param2 in hyperparams:
                if not param['paramName'] == param2["paramName"]:
                    if param2['type'] == "float" or param2['type'] == "integer":
                        temp.append([param2['values'][0]])
                    elif param2['type'] == "array":
                        temp.append(param2['value'])
                    elif param2['type'] == "boolean":
                        if param2['value'] == "True":
                            temp.append([True])
                        else:
                            temp.append([False])
                else:
                    temp.append(param2['value'])
            app.logger.info(f'After array, temp is {temp}')
            concat_arrays(params_raw, list(itertools.product(*temp)))
            app.logger.info(f'Params raw after array is {params_raw}')
            temp = []
            app.logger.info(f'After boolean, temp is {temp}')
            concat_arrays(params_raw, list(itertools.product(*temp)))
            app.logger.info(f'Params raw after boolean is {params_raw}')
            temp = []

    # params_raw = [k['values'] for k in hyperparams]
    # params_raw = [[x for x in np.arange(k[0],k[1]+k[2],k[2])] for k in params_raw

    return enumerate(list(params_raw))
def concat_arrays(arr1, arr2):
    for x in arr2:
        arr1.append(x)

def write_configs(raw, headers):
    dicts = [{headers[i]:np_uncode(x[i]) for i in range(len(x))} for _,x in copy.deepcopy(raw)]
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


