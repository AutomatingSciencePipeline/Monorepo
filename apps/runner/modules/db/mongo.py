import base64
import json
import logging
import os
from bson import Binary
import pymongo
import requests

from pymongo.errors import ConnectionFailure
from modules.data.experiment import ExperimentData
from modules.data.types import DocumentId
from modules.exceptions import DatabaseConnectionError, GladosInternalError
from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, get_filepath_for_experiment_log, get_system_logger

from modules.utils import _get_env

# ENV_MONGODB_PORT = "MONGODB_PORT"
# ENV_MONGODB_USERNAME = "MONGODB_USERNAME"
# ENV_MONGODB_PASSWORD = "MONGODB_PASSWORD"

syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)

# mongoClient = pymongo.MongoClient(
#     "glados-service-mongodb:" + _get_env(ENV_MONGODB_PORT),
#     username=_get_env(ENV_MONGODB_USERNAME),
#     password=_get_env(ENV_MONGODB_PASSWORD),
#     authMechanism='SCRAM-SHA-256',
#     serverSelectionTimeoutMS=1000
# )
# mongoGladosDB = mongoClient["gladosdb"]


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
    callBackend(url, payload, "inserted result csv into mongodb with id")
            
    # experimentResultEntry = {"_id": experiment.expId, "resultContent": resultContent}
    # try:
    #     # DONE: Refactor to call the backend
    #     resultId = resultsCollection.insert_one(experimentResultEntry).inserted_id
    #     explogger.info(f"inserted result csv into mongodb with id: {resultId}")
    # except Exception as err:
    #     raise DatabaseConnectionError("Encountered error while storing aggregated results in MongoDB") from err


def upload_experiment_zip(experiment: ExperimentData, encoded: Binary):
    # Call the backend
    url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/uploadZip'
    payload = {
        "experimentId": experiment.expId,
        "encoded": base64.b64encode(encoded).decode("utf-8")
    } 
    # TODO: maybe turn into a method?
    callBackend(url, payload, "inserted result csv into mongodb with id")
    
    # experimentZipEntry = {"_id": experiment.expId, "fileContent": encoded}
    # try:
    #     # DONE: Refactor to call the backend
    #     resultZipId = resultZipCollection.insert_one(experimentZipEntry).inserted_id
    #     explogger.info(f"inserted zip file into mongodb with id: {resultZipId}")
    # except Exception as err:
    #     raise DatabaseConnectionError("Encountered error while storing results zip in MongoDB") from err


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
    callBackend(url, payload, "inserted log file into mongodb with id")
    #_upload_log_file(experimentId, contents)


# def _upload_log_file(experimentId: DocumentId, contents: str):
#     logFileEntry = {"_id": experimentId, "fileContent": contents}
#     try:
#         # TODO: Refactor to call the backend
#         resultId = logCollection.insert_one(logFileEntry).inserted_id
#         syslogger.info(f"inserted log file into mongodb with id: {resultId}")
#     except Exception as err:
#         raise DatabaseConnectionError("Encountered error while storing log file in MongoDB") from err
    
def callBackend(url, payload, logMsg):
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            resultId = response.json().get('id')
            if resultId:
                explogger.info(f"{logMsg}: {resultId}")
            else:
                raise DatabaseConnectionError("Encountered error while writing document to MongoDB")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while writing document to MongoDB") from err
