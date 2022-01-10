import sys, os
import re
from subprocess import Popen, PIPE, STDOUT
import select
import logging
from concurrent.futures import ThreadPoolExecutor


IPC_FIFO_RECV = 'GLADOS_PROD_A'
IPC_FIFO_SEND = 'GLADOS_PROD_B'


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


def GLB_RUN(n_workers=None):
    logging.debug(f'Initializing global GLB recv pipe...')
    os.mkfifo(f'../apps/frontend/{IPC_FIFO_RECV}')
    try: 
        fifo_r = os.open(f'../apps/frontend/{IPC_FIFO_RECV}', os.O_RDONLY | os.O_NONBLOCK) # pipe is open
        logging.debug('RECV pipe successfully opened.')
        while True:
            try:
                fifo_s = os.open(f'../apps/frontend/{IPC_FIFO_SEND}', os.O_WRONLY)
                logging.debug('SEND pipe has been successfully located.')
                break
            except:
                pass
        try:
            poll = select.poll()
            poll.register(fifo_s, select.POLLIN)
            try:
                with ThreadPoolExecutor(max_workers=n_workers) as executor:
                    while True:
                        if (fifo_r, select.POLLIN) in poll.poll(1000):
                            msg = recv_msg(fifo_r)
                            executor.submit(experiment_event, msg).add_done_callback(experiment_resolve)
                        os.write(fifo_s)
                        logging.info(f'[RECV Event]:\tMsg: {msg.decode("utf-8")}')
            except Exception as e:
                logging.critical(f'FATAL: Pipe: {IPC_FIFO_RECV} failed with exception: {e}');
                exit(2)
        except Exception as e:
            logging.critical(f'FATAL: Pipe: {IPC_FIFO_SEND} failed registration with exception: {e}');
    except Exception as e:
        logging.critical(f'FATAL: Pipe: {IPC_FIFO_RECV} failed creation with exception: {e}');
        exit(2)
        
#    logging.info('Initilized Global Load Balancer.')


def recv_msg(fifo):
    return os.read(fifo, 24)

def proc_msg(msg):
    return msg


def experiment_event(msg):
    pass

def experiment_resolve(future):
    pass
    
if __name__=='__main__':
    logging.getLogger().setLevel(logging.DEBUG)
    glb = GLB()
    glb.run()
