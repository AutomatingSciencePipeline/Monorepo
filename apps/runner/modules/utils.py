import os
import base64
import logging
from bson.binary import Binary
import requests

from modules.data.experiment import ExperimentData
from modules.data.types import DocumentId
from modules.exceptions import DatabaseConnectionError, GladosInternalError
from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, get_filepath_for_experiment_log, get_system_logger
from dotenv import load_dotenv


syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)

# Must override so that vscode doesn't incorrectly parse another env file and have bad values
HAS_DOTENV_FILE = load_dotenv("./.env", override=True)

def _get_env(key: str):
    value = os.environ.get(key)
    if value is None:
        if HAS_DOTENV_FILE:
            raise AssertionError(f"Missing environment variable {key} in your `.env` file")
        raise AssertionError(f"Missing environment variable {key} - you need a `.env` file in this folder with it defined")
    return value

# The backend gives every runner a token that is only valid for its own experiment.
# It is removed from the environment so that trial subprocesses do not inherit it.
_RUNNER_TOKEN = os.environ.pop("RUNNER_TOKEN", None)

REQUEST_TIMEOUT_SECONDS = 10
UPLOAD_TIMEOUT_SECONDS = 120


def backend_url(path: str):
    return f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}{path}'


def backend_auth_headers():
    """Headers that identify this runner to the backend"""
    if not _RUNNER_TOKEN:
        return {}
    return {"Authorization": f"Bearer {_RUNNER_TOKEN}"}


def verify_mongo_connection():
    """Verify the connection to the mongo database

    Raises:
        DatabaseConnectionError: error that connection was unsuccessful
    """
    response = requests.get(backend_url('/mongoPulse'), timeout=REQUEST_TIMEOUT_SECONDS)
    if response.ok:
        return
    else:
        raise DatabaseConnectionError("MongoDB server not available/unreachable")

def upload_experiment_aggregated_results(experiment: ExperimentData, resultContent: str):
    """Upload experiment results to the database

    Args:
        experiment (ExperimentData): experiment data
        resultContent (str): csv data
    """
    # Call the backend
    url = backend_url('/uploadResults')
    payload = {
        "experimentId": experiment.expId,
        "results": resultContent
    }
    _call_backend(url, payload, "inserted result csv into mongodb with id")


def upload_experiment_zip(experiment: ExperimentData, encoded: Binary):
    """Upload experiment zip

    Args:
        experiment (ExperimentData): experiment data
        encoded (Binary): encoded binary of zip for mongo
    """
    # Call the backend
    url = backend_url('/uploadZip')
    payload = {
        "experimentId": experiment.expId,
        "encoded": base64.b64encode(encoded).decode("utf-8")
    }
    _call_backend(url, payload, "inserted zip into mongodb with id")

def upload_experiment_log(experimentId: DocumentId):
    """Upload the experiment log

    Args:
        experimentId (DocumentId): experiment data

    Raises:
        GladosInternalError: error raised
        GladosInternalError: error raised
    """
    file_path = get_filepath_for_experiment_log(experimentId)
    get_system_logger().info('Uploading log file to the database: %s', file_path)

    if len(explogger.handlers) != 0:
        raise GladosInternalError("Experiment logger still has a handler open at upload time. Close it first.")

    contents = None
    try:
        with open(file_path, 'r', encoding="utf8") as log_file:
            contents = log_file.read()
    except Exception as err:
        raise GladosInternalError(f"Failed to read log file for experiment {experimentId}") from err

    # just call the backend here?
    url = backend_url('/uploadLog')
    payload = {
        "experimentId": experimentId,
        "logContents": contents
    }
    _call_backend(url, payload, "inserted log file into mongodb with id")
    
def get_experiment_with_id(experimentId: str):
    """Get the experiment data from the ID

    Args:
        experimentId (str): experiment id in mongo

    Raises:
        DatabaseConnectionError: couldn't connect to db

    Returns:
        json: json contents
    """
    url = backend_url('/getExperiment')
    payload = {
        "experimentId": experimentId
    }
    response = requests.post(url, json=payload, headers=backend_auth_headers(), timeout=REQUEST_TIMEOUT_SECONDS)
    if response.status_code == 200:
        return response.json()['contents']
    else:
        raise DatabaseConnectionError("Error while getting experiment from backend!")

def update_exp_value(experimentId: str, field: str, newValue):
    """Update an experiment dynamically

    Args:
        experimentId (str): _description_
        field (str): _description_
        newValue (_type_): _description_

    Raises:
        DatabaseConnectionError: _description_
    """
    url = backend_url('/updateExperiment')
    payload = {
        "experimentId": experimentId,
        "field": field,
        "newValue": newValue
    }
    response = requests.post(url, json=payload, headers=backend_auth_headers(), timeout=UPLOAD_TIMEOUT_SECONDS)
    if response.status_code == 200:
        return
    else:
        raise DatabaseConnectionError("Error updating experiment document!")

def request_experiment_email(experimentId: str, status: str):
    """Ask the backend to email the experiment creator.

    The backend holds the mail credentials and looks up the recipient itself, so they never reach the runner.

    Args:
        experimentId (str): experiment id in mongo
        status (str): final status to report, one of COMPLETED, FAILED or ABORTED
    """
    payload = {
        "experimentId": experimentId,
        "status": status
    }
    try:
        response = requests.post(backend_url('/sendExperimentEmail'), json=payload, headers=backend_auth_headers(), timeout=30)
        if response.status_code != 200:
            explogger.error(f"Backend refused to send the notification email (status {response.status_code})")
    except Exception as err:  # pylint: disable=broad-exception-caught
        # A missing email must not fail an otherwise finished experiment
        explogger.error(f"Could not ask the backend to send the notification email: {err}")

def release_runner_token():
    """Tell the backend this runner is done, so its token stops working right away instead of at expiry"""
    try:
        requests.post(backend_url('/runnerFinished'), json={}, headers=backend_auth_headers(), timeout=REQUEST_TIMEOUT_SECONDS)
    except Exception as err:  # pylint: disable=broad-exception-caught
        # Not fatal: the token expires on its own
        syslogger.warning("Could not release the runner token: %s", err)

def _call_backend(url, payload, log_msg):
    """calls the backend with provided args

    Args:
        url (str): backend url to be called
        payload (json): payload to send to backend
        logMsg (str): message to log

    Raises:
        DatabaseConnectionError: _description_
        DatabaseConnectionError: _description_
    """
    try:
        response = requests.post(url, json=payload, headers=backend_auth_headers(), timeout=UPLOAD_TIMEOUT_SECONDS)
        if response.status_code == 200:
            result_id = response.json().get('id')
            if result_id:
                explogger.info(f"{log_msg}: {result_id}")
            else:
                raise DatabaseConnectionError("Encountered error while contacting the backend!")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while contacting the backend!") from err
