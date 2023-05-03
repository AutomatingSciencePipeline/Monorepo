import os
import shutil
import logging
from concurrent.futures import ProcessPoolExecutor
import sys
import json
import time
import typing
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
from dotenv import load_dotenv
import pymongo
from pymongo.errors import ConnectionFailure
from bson.binary import Binary
from modules.data.types import DocumentId, IncomingStartRequest

from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, close_experiment_logger, configure_root_logger, open_experiment_logger, upload_experiment_log
from modules.runner import conduct_experiment
from modules.exceptions import CustomFlaskError, GladosInternalError, ExperimentAbort
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files

from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import Parameter, parseRawHyperparameterData

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    logging.error("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

# Must override so that vscode doesn't incorrectly parse another env file and have bad values
HAS_DOTENV_FILE = load_dotenv("./.env", override=True)

ENV_FIREBASE_CREDENTIALS = "FIREBASE_KEY"
ENV_MONGODB_PORT = "MONGODB_PORT"
ENV_CONTACT_MONGODB_AT = "CONTACT_MONGODB_AT"
DB_COLLECTION_EXPERIMENTS = "Experiments"

# set up logger
configure_root_logger()
syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)


def _get_env(key: str):
    value = os.environ.get(key)
    if value is None:
        if HAS_DOTENV_FILE:
            raise AssertionError(f"Missing environment variable {key} in your `.env` file")
        raise AssertionError(f"Missing environment variable {key} - you need a `.env` file in this folder with it defined")
    return value


firebaseCredentials = credentials.Certificate(json.loads(_get_env(ENV_FIREBASE_CREDENTIALS)))
firebaseApp = firebase_admin.initialize_app(firebaseCredentials)
firebaseDb = firestore.client()
firebaseBucket = storage.bucket("gladosbase.appspot.com")

#MongoDB
mongoClient = pymongo.MongoClient(_get_env(ENV_CONTACT_MONGODB_AT), int(_get_env(ENV_MONGODB_PORT)), serverSelectionTimeoutMS=1000)
mongoGladosDB = mongoClient["gladosdb"]
mongoResultsCollection = mongoGladosDB.results
mongoResultsZipCollections = mongoGladosDB.zips

#setting up the app
MAX_WORKERS = 1
runner = ProcessPoolExecutor(MAX_WORKERS)

#setting up the Flask webserver (handles the signal to run an experiment)
flaskApp = Flask(__name__)
CORS(flaskApp)

syslogger.info("GLADOS Backend Started")


@flaskApp.post("/experiment")
def recv_experiment():
    data = request.get_json()
    if _check_request_integrity(data):
        runner.submit(run_batch_and_catch_exceptions, data)
        return Response(status=200)
    syslogger.error("Received malformed experiment request: %s", data)
    return Response(status=400)


@flaskApp.get("/queue")
def get_queue():
    # There must be a cleaner way to access this queue size...
    return jsonify({"queueSize": len(runner._pending_work_items)})


@flaskApp.errorhandler(CustomFlaskError)
def glados_custom_flask_error(error):
    return jsonify(error.to_dict()), error.status_code


def _check_request_integrity(data: typing.Any):
    try:
        return data['experiment']['id'] is not None
    except KeyError:
        return False


def run_batch_and_catch_exceptions(data: IncomingStartRequest):
    try:
        run_batch(data)
    except Exception as err:
        syslogger.error("Unexpected exception while trying to run the experiment, this was not caught by our own code and needs to be handled better.")
        syslogger.exception(err)
        close_experiment_logger()
        # Unsafe to upload experiment logs files here
        raise err


def run_batch(data: IncomingStartRequest):
    syslogger.info('Run_Batch starting with data %s', data)

    # Obtain most basic experiment info
    expId = data['experiment']['id']
    syslogger.debug('received %s', expId)

    open_experiment_logger(expId)

    # Retrieve experiment details from firebase
    try:
        experiments = firebaseDb.collection(DB_COLLECTION_EXPERIMENTS)
        expRef = experiments.document(expId)
        experimentData = expRef.get().to_dict()
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error("Error retrieving experiment data from firebase, aborting")
        close_experiment_run(expId, None, err)
        return

    # Parse hyperaparameters into their datatype. Required to parse the rest of the experiment data
    try:
        hyperparameters: "dict[str,Parameter]" = parseRawHyperparameterData(json.loads(experimentData['hyperparameters'])['hyperparameters'])
    except KeyError as err:
        explogger.error("Error generating configs - hyperparameters not found in experiment object, aborting")
        close_experiment_run(expId, expRef, err)
        return
    experimentData['hyperparameters'] = hyperparameters

    # Parsing into Datatype
    try:
        experiment = ExperimentData(**experimentData)
        experiment.postProcess = experiment.scatter
    except ValueError as err:
        explogger.error("Experiment data was not formatted correctly, aborting")
        close_experiment_run(expId, expRef, err)
        return

    #Downloading Experiment File
    # If the program errors here after you just deleted the ExperimentFiles on your dev machine, restart the docker container, seems to be volume mount weirdness
    os.makedirs(f'ExperimentFiles/{expId}')
    os.chdir(f'ExperimentFiles/{expId}')
    filepath = download_experiment_files(experiment)

    rawfiletype, filetype = determine_experiment_file_type(filepath)
    experiment.experimentType = filetype
    explogger.info(f"Raw Filetype: {rawfiletype}\n Filtered Filetype: {filetype.value}")

    explogger.info(f"Generating configs and downloading to ExperimentFiles/{expId}/configFiles")

    totalExperimentRuns = generate_config_files(experiment)
    if totalExperimentRuns == 0:
        os.chdir('../..')
        close_experiment_run(expId, expRef, GladosInternalError("Error generating configs - somehow no config files were produced?"))

    experiment.totalExperimentRuns = totalExperimentRuns

    expRef.update({"totalExperimentRuns": experiment.totalExperimentRuns})

    possibleException = None
    try:
        conduct_experiment(experiment, expRef)

        post_process_experiment(experiment)

        upload_experiment_results(experiment)
    except ExperimentAbort as err:
        explogger.error(f'Experiment {expId} critical failure, not doing any result uploading or post processing')
        possibleException = err
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error(f'Uncaught exception "{err}" while running an experiment. The GLADOS code needs to be changed to handle this in a cleaner manner')
        possibleException = err
    finally:
        close_experiment_run(expId, expRef, possibleException)
        os.chdir('../..')


def close_experiment_run(expId: DocumentId, expRef: "typing.Any | None", error: "Exception | None"):
    if error:
        explogger.exception(error)
    explogger.info(f'Exiting experiment {expId}')
    if expRef:
        expRef.update({'finished': True, 'finishedAtEpochMillis': int(time.time() * 1000)})
    else:
        syslogger.warning(f'No experiment ref supplied when closing {expId} , could not update it to finished')
    close_experiment_logger()
    upload_experiment_log(expId)


def determine_experiment_file_type(filepath):
    rawfiletype = magic.from_file(filepath)
    explogger.info("Raw filetype is %s", rawfiletype)
    filetype = 'unknown'
    if 'Python script' in rawfiletype or 'python3' in rawfiletype:
        filetype = ExperimentType.PYTHON
    elif 'Java archive data (JAR)' in rawfiletype:
        filetype = ExperimentType.JAVA

    if filetype == 'unknown':
        explogger.info(f"{rawfiletype} could not be mapped to python or java, if it should consider updating the matching statements")
        raise NotImplementedError("Unknown experiment file type")
    return rawfiletype, filetype


def download_experiment_files(experiment: ExperimentData):
    if experiment.trialExtraFile != '' or experiment.postProcess != '' or experiment.keepLogs:
        explogger.info('There will be experiment outputs')
        os.makedirs('ResCsvs')
    explogger.info(f'Downloading file for {experiment.expId}')

    filepath = f'experiment{experiment.expId}'
    experiment.file = filepath
    explogger.info(f"Downloading {filepath} to ExperimentFiles/{experiment.expId}/{filepath}")
    try:
        filedata = firebaseBucket.blob(filepath)
        filedata.download_to_filename(filepath)
    except Exception as err:
        explogger.error(f"Error {err} occurred while trying to download experiment file")
        raise GladosInternalError('Failed to download experiment files') from err
    explogger.info(f"Downloaded {filepath} to ExperimentFiles/{experiment.expId}/{filepath}")
    return filepath


def upload_experiment_results(experiment: ExperimentData):
    """
    Call this function when inside the experiment folder!
    """
    explogger.info('Uploading Results to the frontend')
    uploadBlob = firebaseBucket.blob(f"results/result{experiment.expId}.csv")
    uploadBlob.upload_from_filename('results.csv')

    _upload_to_mongodb(experiment)

    if experiment.trialExtraFile != '' or experiment.postProcess or experiment.keepLogs:
        explogger.info('Uploading Result Csvs')
        try:
            shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')

            # TODO remove firebase usage once transition to mongo file storage is complete
            uploadBlob = firebaseBucket.blob(f"results/result{experiment.expId}.zip")
            uploadBlob.upload_from_filename('ResultCsvs.zip')

            # mongoResultsZipCollections
            with open("ResultCsvs.zip", "rb") as file:
                encoded = Binary(file.read())
            experimentZipEntry = {"_id": experiment.expId, "fileContent": encoded}
            try:
                resultZipId = mongoResultsZipCollections.insert_one(experimentZipEntry).inserted_id
                explogger.info(f"inserted zip file into mongodb with id: {resultZipId}")
            except Exception as err:
                raise GladosInternalError("Encountered error while inserting results into MongoDB") from err
        except Exception as err:
            raise GladosInternalError("Error uploading experiment results") from err


def _upload_to_mongodb(experiment: ExperimentData):
    explogger.info('Uploading to MongoDB')
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        raise GladosInternalError("MongoDB server not available/unreachable") from err

    experimentData = None
    try:
        experimentFile = open("results.csv", encoding='utf8')
        experimentData = experimentFile.read()
        experimentFile.close()
    except Exception as err:
        raise GladosInternalError("Failed to read file data for upload to mongodb") from err

    experimentResultEntry = {"_id": experiment.expId, "resultContent": experimentData}
    try:
        resultId = mongoResultsCollection.insert_one(experimentResultEntry).inserted_id
        explogger.info(f"inserted result csv into mongodb with id: {resultId}")
    except Exception as err:
        raise GladosInternalError("Encountered error while inserting results into MongoDB") from err


def post_process_experiment(experiment: ExperimentData):
    """
    Call this function when inside the experiment folder!
    """
    if experiment.postProcess:
        explogger.info("Beginning post processing")
        try:
            if experiment.scatter:
                explogger.info("Creating Scatter Plot")
                depVar = experiment.scatterDepVar
                indVar = experiment.scatterIndVar
                generateScatterPlot(indVar, depVar, 'results.csv', experiment.expId)
        except KeyError as err:
            raise GladosInternalError("Error during plot generation") from err


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
