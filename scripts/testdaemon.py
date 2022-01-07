import sys, os
import re
from subprocess import Popen, PIPE, STDOUT
import select
import logging

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

class GLB():

    def __init__(self, n_workers=None):
        logging.debug(f'Initializing global GLB recv pipe...')
        os.mkfifo(f'../apps/frontend/{IPC_FIFO_RECV}')
        try: 
            self.fifo_r = os.open(f'../apps/frontend/{IPC_FIFO_RECV}', os.O_RDONLY | os.O_NONBLOCK) # pipe is open
            logging.debug('RECV pipe successfully opened.')
            while True:
                try:
                    self.fifo_s = os.open(f'../apps/frontend/{IPC_FIFO_SEND}', os.O_WRONLY)
                    logging.debug('SEND pipe has been successfully located.')
                    break
                except:
                    pass
            try:
                self.poll = select.poll()
                self.poll.register(self.fifo_s, select.POLLIN)
            except Exception as e:
                logging.critical(f'FATAL: Pipe: {IPC_FIFO_SEND} failed registration with exception: {e}');
        except Exception as e:
            logging.critical(f'FATAL: Pipe: {IPC_FIFO_RECV} failed creation with exception: {e}');
            exit(2)
            
        logging.info('Initilized Global Load Balancer.')

    def run(self):
        try:
            while True:
                if (self.fifo_r, select.POLLIN) in self.poll.poll(1000):
                    msg = self.recv_msg(self.fifo_r)
                    msg = self.proc_msg(msg)
                    os.write(self.fifo_s)
                    logging.info(f'[RECV Event]:\tMsg: {msg.decode("utf-8")}')
        except Exception as e:
            logging.critical(f'FATAL: Pipe: {IPC_FIFO_RECV} failed with exception: {e}');
            exit(2)

    def recv_msg(self,fifo):
        return os.read(fifo, 24)

    def proc_msg(self,msg):
        return msg
#def global():
#    while True:
#        if jobalert():
#            ### pipe from parent to all kids >> unique to kid >> kid waits for queue notification to exec
#            pid = fork()
#
#            if pid == 0:
#                ## experiment
#                ## write configs / prepare working directory / do other shit
#                ## start timer
#                for i in range(total_iterations):
#                     
#                    pid = fork()
#                    if pid == 0:
#                        exec()
#                    
#    
#                 ## reduction wait daemon
#
#    #if clean:
#    #    files = os.listdir()
#    #    files = [file for file in files if re.search("\.init$", file)]
#    #    try:
#    #        for file in files: os.remove(file)
#    #    except Exception as e:
#    #        print('FATAL')
#    #        print(e)
#    #        exit()
#    #    print(files)
#    #    exit()
#
#    #print(f'Generating random numbers from input.')
#    #if itrcount:
#    #    for i in range(itrcount):
#    #        generate_conf(number,override,i)
#    #else:
#    #    generate_conf(number,override,i)
#
#    #print(f'Data generation complete. Config file/s written to ./config(rangeof itercount).ini\nReading from config.ini')
#    vvalues = [read_conf(value) for value in range(itrcount)]
#    payloads = ['\n'.join('{}'.format(i) for i in values) for values in vvalues]
#    mapper_outs = [communicate('varmeanmapper.py', payload) for payload in payloads]
#    print(f'Communications complete, initiated pipes with {len(payloads)} processes and gathered outputs for reduction successfully.')
#
#    reduce_in = ''.join(mapper_outs)
#    reducer_out = communicate('varmeanreducer.py',reduce_in)
#    print(reducer_out)
#
#def read_conf(itr : int) -> list[float]:
#    config.read(f'config{itr}.init')
#    return list(map(float,json.loads(config.get("DEFAULT","nums"))))
#     
#def generate_conf(number : int, ov : bool, itr : int) -> type(None):
#    vals = random.random(number)
#    print(f'Placing random numbers into config.ini if file does not exist.')
#    try:
#        f = open(f'config{itr}.init','x')
#        f.write(f'[DEFAULT]\nnums=[{",".join(map(str,vals))}]')
#    except Exception as e:
#        if not ov:
#            print(f'FATALi {e=}, {type(e)}=')
#            exit()
#        else:
#            os.remove('config.init')
#            return generate_conf(number,False)
#
#def communicate(process:str, payload: list[str]) -> list[str]:
#    print(f'initiating communication and process at {process}')
#    with Popen(['python',process], stdout=PIPE, stdin=PIPE, stderr=PIPE,encoding='utf8') as p:
#        try:
#            stdout_data = p.communicate(input=payload)
#            print(f'data returned from pipe is {stdout_data[0]}')
#            if not stdout_data[1]:
#                print(f'errors returned from pipe is {stdout_data[1]}')
#        except Exception as e:
#            print('FATAL')
#            print(e)
#            exit()
#
#    return stdout_data[0] if stdout_data else None
#
#
#if __name__=="__main__":
#    main()
if __name__=='__main__':
    logging.getLogger().setLevel(logging.DEBUG)
    glb = GLB()
    glb.run()
