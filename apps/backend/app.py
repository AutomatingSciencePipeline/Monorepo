"""Module that uses flask to host endpoints for the backend"""
from concurrent.futures import ProcessPoolExecutor
from sys import stdout
from flask import Flask, Response, request, jsonify
from kubernetes import client, config
from spawn_runner import create_job, create_job_object
from flask_cors import CORS

flaskApp = Flask(__name__)
CORS(flaskApp)

config.load_incluster_config()
BATCH_API = client.BatchV1Api()

MAX_WORKERS = 1
executor = ProcessPoolExecutor(MAX_WORKERS)

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

if __name__ == '__main__':
    flaskApp.run()
