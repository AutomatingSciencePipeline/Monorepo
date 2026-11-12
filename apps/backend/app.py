"""Module that uses flask to host endpoints for the backend"""
import io
import functools
import threading
import base64
from concurrent.futures import ProcessPoolExecutor
import os
from bson import ObjectId
from bson.binary import Binary
from flask import Flask, Response, request, jsonify, send_file, g
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import pymongo
from modules.mongo import upload_experiment_aggregated_results, upload_experiment_zip, upload_log_file, verify_mongo_connection, check_insert_default_experiments, download_experiment_file, get_experiment, update_exp_value
from modules.auth import ServiceAccountAuthenticator, bearer_token, claim_email_send, experiment_for_runner_token, is_allowed_runner_update, is_valid_experiment_id, is_valid_job_name, issue_runner_token, revoke_runner_token, revoke_runner_tokens, EMAIL_ALLOWED_STATUSES
from modules.mail import send_experiment_email
from modules.runner_job import load_runner_template, token_ttl_seconds

from spawn_runner import create_job, create_job_object
flaskApp = Flask(__name__)

config.load_incluster_config()
BATCH_API = client.BatchV1Api()

# Only these identities may call the control-plane endpoints (start, cancel, queue).
# They authenticate with a ServiceAccount token that is bound to the backend audience.
CONTROL_PLANE_SUBJECTS = [
    subject.strip() for subject in
    os.getenv("CONTROL_PLANE_ALLOWED_SUBJECTS", "system:serviceaccount:default:glados-frontend").split(",")
    if subject.strip()
]
controlPlaneAuth = ServiceAccountAuthenticator(
    client.AuthenticationV1Api(),
    CONTROL_PLANE_SUBJECTS,
    os.getenv("BACKEND_TOKEN_AUDIENCE", "glados-backend"),
)

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
    serverSelectionTimeoutMS=1000,
    replicaSet='rs0'
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


def require_control_plane(view):
    """Only lets the frontend (or another allowed control-plane identity) call the endpoint"""
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        if not controlPlaneAuth.is_authorized(bearer_token(request.headers.get("Authorization"))):
            return Response(status=401)
        return view(*args, **kwargs)
    return wrapper


def require_runner(view):
    """Only lets a runner call the endpoint, and records which experiment its token is valid for"""
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        token = bearer_token(request.headers.get("Authorization"))
        try:
            experiment_id = experiment_for_runner_token(mongoClient, token)
        except Exception:  # pylint: disable=broad-exception-caught
            return Response(status=503)
        if experiment_id is None:
            return Response(status=401)
        g.runner_token = token
        g.runner_experiment_id = experiment_id
        return view(*args, **kwargs)
    return wrapper


def _runner_owns(experiment_id) -> bool:
    """A runner token is only valid for the experiment it was issued for"""
    return isinstance(experiment_id, str) and experiment_id == g.runner_experiment_id


def _json_body() -> dict:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


@flaskApp.route('/')
def hello_world():
    """For testing if there is a connection to the backend"""
    return Response(status=200)

@flaskApp.get("/queue")
@require_control_plane
def get_queue():
    """The query to get the size of the queue"""
    # There must be a cleaner way to access this queue size...
    return jsonify({"queueSize": len(executor._pending_work_items)})

@flaskApp.post("/experiment")
@require_control_plane
def recv_experiment():
    """The query to run an experiment"""
    experiment = _json_body().get('experiment')
    if not isinstance(experiment, dict):
        return Response(status=400)
    experiment_id = experiment.get('id')
    if not is_valid_experiment_id(experiment_id):
        return Response(status=400)
    try:
        creator_id = get_experiment(experiment_id, mongoClient).get('creator')
        creator = None
        if isinstance(creator_id, (str, ObjectId)) and creator_id:
            user_id = ObjectId(creator_id) if ObjectId.is_valid(creator_id) else creator_id
            creator = gladosDB.users.find_one({'_id': user_id}, {'role': 1})
        # Historical experiment metadata cannot grant privileges after a role change.
        creator_role = creator.get('role') if creator else None
    except Exception:  # pylint: disable=broad-exception-caught
        return Response(status=404)
    runner_token = issue_runner_token(mongoClient, experiment_id, token_ttl_seconds(load_runner_template()))
    executor.submit(spawn_job, create_job_object(experiment_id, runner_token, creator_role))
    return Response(status=200)

def spawn_job(job):
    """Function for creating a job"""
    create_job(BATCH_API, job)

@flaskApp.post("/cancelExperiment")
@require_control_plane
def cancel_experiment():
    """The query to cancel an experiment"""
    job_name = _json_body().get('jobName')
    if not is_valid_job_name(job_name):
        return Response(status=400)
    try:
        BATCH_API.delete_namespaced_job(job_name, "default", propagation_policy="Background")
    except ApiException as err:
        if err.status != 404:
            raise
        revoke_runner_tokens(mongoClient, job_name[len("runner-"):])
        return Response(status=404)
    # Revoke only after deletion is accepted, so a failed delete leaves the runner usable.
    revoke_runner_tokens(mongoClient, job_name[len("runner-"):])
    return Response(status=200)

@flaskApp.post("/uploadResults")
@require_runner
def upload_results():
    json = _json_body()
    # Get JSON requests
    experimentId = json.get('experimentId')
    results = json.get('results')
    if not _runner_owns(experimentId):
        return Response(status=403)
    if not isinstance(results, str):
        return Response(status=400)
    # now call the mongo stuff
    return {'id': upload_experiment_aggregated_results(experimentId, results, mongoClient)}

@flaskApp.post("/uploadZip")
@require_runner
def upload_zip():
    json = _json_body()
    # Get JSON requests
    experimentId = json.get('experimentId')
    if not _runner_owns(experimentId):
        return Response(status=403)
    if not isinstance(json.get('encoded'), str):
        return Response(status=400)
    encoded = Binary(base64.b64decode(json['encoded']))
    return {'id': upload_experiment_zip(experimentId, encoded, mongoClient)}

@flaskApp.post("/uploadLog")
@require_runner
def upload_log():
    json = _json_body()
    # Get JSON requests
    experimentId = json.get('experimentId')
    logContents = json.get('logContents')
    if not _runner_owns(experimentId):
        return Response(status=403)
    if not isinstance(logContents, str):
        return Response(status=400)
    return {'id': upload_log_file(experimentId, logContents, mongoClient)}

@flaskApp.get("/mongoPulse")
def check_mongo():
    try:
        verify_mongo_connection(mongoClient)
        return Response(status=200)
    except Exception:
        return Response(status=500)

@flaskApp.get("/downloadExpFile")
@require_runner
def download_exp_file():
    try:
        file_id = request.args.get('fileId', default='', type=str)
        # A runner may only download the file that belongs to its own experiment
        if get_experiment(g.runner_experiment_id, mongoClient).get('file') != file_id:
            return Response(status=403)
        file_data = download_experiment_file(file_id, mongoClient)
        file_stream = io.BytesIO(file_data)
        return send_file(file_stream, as_attachment=True, download_name="experiment_file", mimetype="application/octet-stream")
    except Exception:
        return Response(status=500)

@flaskApp.post("/getExperiment")
@require_runner
def get_experiment_post():
    experiment_id = _json_body().get('experimentId')
    if not _runner_owns(experiment_id):
        return Response(status=403)
    try:
        return {'contents': get_experiment(experiment_id, mongoClient)}
    except Exception:
        return Response(status=500)

@flaskApp.post("/updateExperiment")
@require_runner
def update_experiment():
    json = _json_body()
    experiment_id = json.get('experimentId')
    field = json.get('field')
    newVal = json.get('newValue')
    if not _runner_owns(experiment_id):
        return Response(status=403)
    # Runners report progress only, they cannot change who owns an experiment or what role it runs with
    if not is_allowed_runner_update(field, newVal):
        return Response(status=403)
    try:
        update_exp_value(experiment_id, field, newVal, mongoClient)
        return Response(status=200)
    except Exception:
        return Response(status=500)

@flaskApp.post("/sendExperimentEmail")
@require_runner
def send_email():
    """Sends the "experiment finished" email. The recipient and counts come from the database."""
    json = _json_body()
    experiment_id = json.get('experimentId')
    status = json.get('status')
    if not _runner_owns(experiment_id):
        return Response(status=403)
    if status not in EMAIL_ALLOWED_STATUSES:
        return Response(status=400)
    try:
        experiment = get_experiment(experiment_id, mongoClient)
        if not experiment.get('sendEmail'):
            return jsonify({'sent': False})
        # One email per runner token, so a runner cannot be used to flood a mailbox
        if not claim_email_send(mongoClient, g.runner_token):
            return Response(status=429)
        return jsonify({'sent': send_experiment_email(experiment, status)})
    except Exception:
        return Response(status=500)

@flaskApp.post("/runnerFinished")
@require_runner
def runner_finished():
    """Called by a runner as its last step. Its token stops working right away instead of at expiry."""
    try:
        revoke_runner_token(mongoClient, g.runner_token)
        return Response(status=200)
    except Exception:
        return Response(status=500)

if __name__ == '__main__':
    flaskApp.run()
