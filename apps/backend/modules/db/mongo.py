import logging
import os
from bson import Binary
import pymongo

from pymongo.errors import ConnectionFailure
from modules.data.experiment import ExperimentData
from modules.data.types import DocumentId
from modules.exceptions import DatabaseConnectionError, GladosInternalError
from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, get_filepath_for_experiment_log, get_system_logger

from modules.utils import _get_env

ENV_MONGODB_PORT = "MONGODB_PORT"
ENV_CONTACT_MONGODB_AT = "CONTACT_MONGODB_AT"

syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)

mongoClient = pymongo.MongoClient(_get_env(ENV_CONTACT_MONGODB_AT), int(_get_env(ENV_MONGODB_PORT)), serverSelectionTimeoutMS=1000)
mongoGladosDB = mongoClient["gladosdb"]

resultsCollection = mongoGladosDB.results
resultZipCollection = mongoGladosDB.zips
logCollection = mongoGladosDB.logs


def verify_mongo_connection():
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        raise DatabaseConnectionError("MongoDB server not available/unreachable") from err


def upload_experiment_aggregated_results(experiment: ExperimentData, resultContent: str):
    experimentResultEntry = {"_id": experiment.expId, "resultContent": resultContent}
    try:
        resultId = resultsCollection.insert_one(experimentResultEntry).inserted_id
        explogger.info(f"inserted result csv into mongodb with id: {resultId}")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while storing aggregated results in MongoDB") from err


def upload_experiment_zip(experiment: ExperimentData, encoded: Binary):
    experimentZipEntry = {"_id": experiment.expId, "fileContent": encoded}
    try:
        resultZipId = resultZipCollection.insert_one(experimentZipEntry).inserted_id
        explogger.info(f"inserted zip file into mongodb with id: {resultZipId}")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while storing results zip in MongoDB") from err


def upload_experiment_log(experimentId: DocumentId):
    filePath = get_filepath_for_experiment_log(experimentId)
    get_system_logger().info('TODO Uploading log file to the database: %s', filePath)

    if len(explogger.handlers) != 0:
        raise GladosInternalError("Experiment logger still has a handler open at upload time. Close it first.")

    contents = None
    try:
        with open(filePath, 'r', encoding="utf8") as logFile:
            contents = logFile.read()
    except Exception as err:
        raise GladosInternalError(f"Failed to read log file for experiment {experimentId}") from err

    _upload_log_file(experimentId, contents)


def _upload_log_file(experimentId: DocumentId, contents: str):
    logFileEntry = {"_id": experimentId, "fileContent": contents}
    try:
        resultId = logCollection.insert_one(logFileEntry).inserted_id
        syslogger.info(f"inserted log file into mongodb with id: {resultId}")
    except Exception as err:
        raise DatabaseConnectionError("Encountered error while storing log file in MongoDB") from err
