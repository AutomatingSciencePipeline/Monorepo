"""Module that uses flask to host endpoints for the backend"""
import threading
import base64
from concurrent.futures import ProcessPoolExecutor
import os
import bson
from flask import Flask, Response, request, jsonify
from kubernetes import client, config
import pymongo
from modules.mongo import upload_experiment_aggregated_results, upload_experiment_zip, upload_log_file, verify_mongo_connection, check_insert_default_experiments, download_experiment_file, get_experiment

from spawn_runner import create_job, create_job_object
flaskApp = Flask(__name__)

config.load_incluster_config()
BATCH_API = client.BatchV1Api()

MAX_WORKERS = 1
executor = ProcessPoolExecutor(MAX_WORKERS)

# Mongo Setup
# create the mongo client
mongoClient = pymongo.MongoClient(
    "glados-service-mongodb",
    int(str(os.getenv("MONGODB_PORT"))),
    username=str(os.getenv("MONGODB_USERNAME")),
    password=str(os.getenv("MONGODB_PASSWORD")),
    authMechanism='SCRAM-SHA-256',
    serverSelectionTimeoutMS=1000
)
# connect to the glados database
gladosDB = mongoClient["gladosdb"]
# call the function to check if the documents for default experiments exist
# start that in a different thread so that it can do its thing in peace
addDefaultExpsThread = threading.Thread(target=check_insert_default_experiments, args={mongoClient})
addDefaultExpsThread.start()

# setup the mongo collections
experimentsCollection = gladosDB.experiments
resultsCollection = gladosDB.results
resultZipCollection = gladosDB.zips
logCollection = gladosDB.logs

@flaskApp.route('/')
def hello_world():
    """For testing if there is a connection to the backend"""
    return Response(status=200)

@flaskApp.get("/queue")
def get_queue():
    """The query to get the size of the queue"""
    # There must be a cleaner way to access this queue size...
    return jsonify({"queueSize": len(executor._pending_work_items)})

@flaskApp.post("/experiment")
def recv_experiment():
    """The query to run an experiment"""
    data = request.get_json()
    executor.submit(spawn_job, data)
    return Response(status=200)

def spawn_job(experiment_data):
    """Function for creating a job"""
    job = create_job_object(experiment_data)
    create_job(BATCH_API, job)
    
@flaskApp.post("/uploadResults")
def upload_results():
    json = request.get_json()
    # Get JSON requests
    experimentId = json['experimentId']
    results = json['results']
    # now call the mongo stuff
    return {'id': upload_experiment_aggregated_results(experimentId, results, mongoClient)}

@flaskApp.post("/uploadZip")
def upload_zip():
    json = request.get_json()
    # Get JSON requests
    experimentId = json['experimentId']
    encoded = bson.Binary(base64.b64decode(json['encoded']))
    return {'id': upload_experiment_zip(experimentId, encoded, mongoClient)}

@flaskApp.post("/uploadLog")
def upload_log():
    json = request.get_json()
    # Get JSON requests
    experimentId = json['experimentId']
    logContents = json['logContents']
    return {'id': upload_log_file(experimentId, logContents, mongoClient)}
    
@flaskApp.get("/mongoPulse")
def check_mongo():
    try:
        verify_mongo_connection(mongoClient)
        return Response(status=200)
    except Exception:
        return Response(status=500)
    
@flaskApp.get("/downloadExpFile")
def download_exp_file():
    try:
        experiment_id = request.args.get('expId', default='', type=str)
        return {'contents': download_experiment_file(experiment_id, mongoClient)}
    except Exception:
        return Response(status=500)
    
@flaskApp.post("/getExperiment")
def get_experiment_post():
    try:
        experiment_id = request.args.get('expId', default='', type=str)
        return {'contents': get_experiment(experiment_id, mongoClient)}
    except Exception:
        return Response(status=500)

if __name__ == '__main__':
    flaskApp.run()
