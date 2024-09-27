"""Module that uses flask to host endpoints for the backend"""
from concurrent.futures import ProcessPoolExecutor
import os
from flask import Flask, Response, request, jsonify
from kubernetes import client, config
import pymongo
from pymongo.errors import ConnectionFailure
import modules.mongo as mongo

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
    experiment = json['experiment']
    results = json['results']
    # now call the mongo stuff
    return {'id': mongo.upload_experiment_aggregated_results(experiment, results, mongoClient)}
    
@flaskApp.get("/mongocheck")
def check_mongo():
    try:
        mongo.verify_mongo_connection(mongoClient)
        return Response(status=200)
    except:
        return Response(status=500)

if __name__ == '__main__':
    flaskApp.run()
