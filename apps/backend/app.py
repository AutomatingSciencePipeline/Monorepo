import kubernetes
import logging
from concurrent.futures import ProcessPoolExecutor
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from modules.logging.gladosLogging import SYSTEM_LOGGER, configure_root_logger
import typing


# New backend just spawns jobs, has the /experiment endpoint
# TODO: do this using either subprocess + kubectl or python kubernetes

# set up logger
configure_root_logger()
syslogger = logging.getLogger(SYSTEM_LOGGER)

# setting up the server
MAX_WORKERS = 1 # The max number of processes
runner = ProcessPoolExecutor(MAX_WORKERS) # Runs code in parallel using MAX_WORKERS number of processes

# setting up the Flask webserver
flaskApp = Flask(__name__)
CORS(flaskApp)

syslogger.info("GLADOS Backend Started")

"""
The query to run an experiment. 

@body   experiment  The experiment's data. Must include property 'id'
@return             The status code. 200 for success, 400 for error.
"""
@flaskApp.post("/experiment")
def recv_experiment():
    data = request.get_json()
    if _check_request_integrity(data):
        # TODO: replace with 
        # add the "run experiment" task to the queue
        #runner.submit(run_batch_and_catch_exceptions, data)
        return Response(status=200)
    syslogger.error("Received malformed experiment request: %s", data)
    return Response(status=400)


"""
A function that checks if the body contains an experiment id

@param  data    Any json object
@return         True if the data contains an experiment and the experiment contains an id. Otherwise returns false
"""
def _check_request_integrity(data: typing.Any):
    try:
        return data['experiment']['id'] is not None
    except KeyError:
        return False