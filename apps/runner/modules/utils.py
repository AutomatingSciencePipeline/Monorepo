import os
import base64
import logging
from bson import Binary
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

def verify_mongo_connection():
    """Verify the connection to the mongo database

    Raises:
        DatabaseConnectionError: error that connection was unsuccessful
    """
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/mongoPulse'
    response = requests.get(url, timeout=10)
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
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadResults'
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
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadZip'
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
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadLog'
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
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/getExperiment'
    payload = {
        "experimentId": experimentId
    }
    response = requests.post(url, json=payload, timeout=10)
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
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/updateExperiment'
    payload = {
        "experimentId": experimentId,
        "field": field,
        "newValue": newValue
    }
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return
    else:
        raise DatabaseConnectionError("Error updating experiment document!")

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
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            result_id = response.json().get('id')
            if result_id:
                explogger.info(f"{log_msg}: {result_id}")
            else:
                raise DatabaseConnectionError("Encountered error while contacting the backend!")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while contacting the backend!") from err
