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
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/mongoPulse'
    response = requests.get(url)
    if response.ok:
        return
    else:
        raise DatabaseConnectionError("MongoDB server not available/unreachable")
    


def upload_experiment_aggregated_results(experiment: ExperimentData, resultContent: str):
    # Call the backend
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadResults'
    payload = {
        "experimentId": experiment.expId,
        "results": resultContent
    }
    _callBackend(url, payload, "inserted result csv into mongodb with id")


def upload_experiment_zip(experiment: ExperimentData, encoded: Binary):
    # Call the backend
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadZip'
    payload = {
        "experimentId": experiment.expId,
        "encoded": base64.b64encode(encoded).decode("utf-8")
    }
    _callBackend(url, payload, "inserted zip into mongodb with id")

def upload_experiment_log(experimentId: DocumentId):
    filePath = get_filepath_for_experiment_log(experimentId)
    get_system_logger().info('Uploading log file to the database: %s', filePath)

    if len(explogger.handlers) != 0:
        raise GladosInternalError("Experiment logger still has a handler open at upload time. Close it first.")

    contents = None
    try:
        with open(filePath, 'r', encoding="utf8") as logFile:
            contents = logFile.read()
    except Exception as err:
        raise GladosInternalError(f"Failed to read log file for experiment {experimentId}") from err

    # just call the backend here?
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadLog'
    payload = {
        "experimentId": experimentId,
        "logContents": contents
    }
    _callBackend(url, payload, "inserted log file into mongodb with id")
    
def get_experiment_with_id(experimentId: str):
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/getExperiment'
    payload = {
        "experimentId": experimentId
    }
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()['contents']
    else:
        raise DatabaseConnectionError("Error while getting experiment from backend!")

def _callBackend(url, payload, logMsg):
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            resultId = response.json().get('_id')
            if resultId:
                explogger.info(f"{logMsg}: {resultId}")
            else:
                raise DatabaseConnectionError("Encountered error while contacting the backend!")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while contacting the backend!") from err

