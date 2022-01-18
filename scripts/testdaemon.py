import sys, os
import re
from subprocess import Popen, PIPE, STDOUT
import select
import logging
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import importlib
import requests
from flask import Flask, jsonify, request
import numpy as np
import itertools
import csv
import json


IPC_FIFO_RECV = 'GLADOS_PROD_A'
IPC_FIFO_SEND = 'GLADOS_PROD_B'
app = Flask(__name__)
app.config['DEBUG'] = True


#"JOB: [DIRECTORY]"
## directory :: [hyperparams.json, experiment.bin, metadata, sub/[run]*] 
#
#'''
#x = [1,2,4,5]
#lr = [0.001,0.01,0.1]
#
#in::[x=1,lr=0.001] >> mapper1 -> out::[..vals..] >> reducer [ csv {x=1,lr=0.001}
#in::[x=1,lr=0.001] >> mapper2 -> out::[..vals..] >> reducer
#in::[x=1,lr=0.001] >> mapper3 -> out::[..vals..] >> reducer
#in::[x=1,lr=0.001] >> mapper4 -> out::[..vals..] >> reducer ]
#
#'''
#



@app.post("/experiment")
def recv_experiment():
    if request.is_json():
        exp = request.get_json()
        GlobalLoadBalancer.submit_experiment(json.loads(exp))
class GLB(object):

    def __init__(self, n_workers=None):
        self.e_status = {}
        self.e = ProcessPoolExecutor(n_workers)
        self.f = ThreadPoolExecutor(n_workers)
        logging.debug(f'GLB: {n_workers} workers initialized. Awaiting requests...')
        
    def submit_experiment(self, msg):
        self.e_status[msg['id']] = 'INIT'
        msg['func'] = add_nums
        logging.info(f'Experiment {msg["id"]} by {msg["user"]} submitted.')
        self.e.submit(experiment_event, msg).add_done_callback(experiment_resolve)
        
    
    def update_experiment_status(self, id, status):
        self.e_status[id] = status
        

def experiment_event(msg):
    params = proc_msg(msg)
    # within each experiment, we use threads
    os.chdir(f'exps')
    os.mkdir(f'{params["id"]}')
    os.chdir(f'{params["id"]}')
    param_iter = gen_configs(params['hyperparams'])
    func = params['func']
    ## process stuff and make API call to inform of the experiment's commencement
    results = []
    dead = 0
    #print(params['id'])
    with ThreadPoolExecutor(1) as executor:
        #print(param_iter)        
        result_futures = list(map(lambda x: executor.submit(mapper, {'func':func,'params':x}), param_iter))
        for future in as_completed(result_futures):
            try:
                results.append(future.result())
            except ValueError as e:
                ### write temporary state of problems
                #print(e)
                results.append(e.args[1] + [0])
                dead+=1
    ## process stuff and make API call to inform of the experiment's completion
    ### write results to a csv file named experiment_id.csv
    with open(f'result.csv', 'w') as csvfile:
        header = [k['paramName'] for k in params['hyperparams']]
        header.append('result')
        writer = csv.writer(csvfile)
        writer.writerow(header)
        writer.writerows(results)
    
    return params['id'],1.-float(dead)/len(results),results
    

        
                


def gen_configs(hyperparams):
    ### Generate hyperparameter configurations
    params_raw = [k['values'] for i,k in enumerate(hyperparams)]
    params_raw = [[x for x in np.arange(k[0],k[1]+k[2],k[2])] for k in params_raw]
    return list(itertools.product(*params_raw))
    
    
        

def recv_msg(fifo):
    return os.read(fifo, 24)

def proc_msg(msg):
    ## process incoming message pipe
    return msg

def experiment_resolve(future):
    ### Make API call to inform of completion of experiment
    id, prog, results = future.result()
    GlobalLoadBalancer.update_experiment_status(id, 'DONE')
    logging.info(f'[EXP COMPLETE]:\tExperiment {id} completed with {prog} success rate.')

def mapper(params):
    try: 
        return list(params['params']) + [params['func'](*params['params'])]
    except Exception as e:
        raise ValueError(f'Mapper failed with exception: {e} and params:', params)
    
def add_nums(x,y):
    ## for testing purposes.
    return x+y
    
if __name__=='__main__':
    logging.getLogger().setLevel(logging.DEBUG)
    GlobalLoadBalancer = GLB(1)
    hyperparams = [{'paramName':'x','values':[0,10,0.1]},{'paramName':'y','values':[5,100,5]}]
    msg_test = {
        'id' : 'XVZ01',
        'user' : 'elijah',
        'func' : add_nums,
        'hyperparams' : hyperparams
    }
    GlobalLoadBalancer.submit_experiment(msg_test)
    #app.run()
    

### plot postprocessing / native support ###
### gen intermediate plots live ###
### [debug mode]: switch to not write configuration
### intermediate checks: every n iterations, restrict param space based on provided code
### MPI

##: Future:
'''
1. refined front-end >> integrate with the db and crud 
2.  > modularity:
    > distribution across the network >> MPI 
3. stitch the system together
'''