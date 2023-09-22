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
from bson.binary import Binary

from modules.data.types import DocumentId, IncomingStartRequest
from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import Parameter, parseRawHyperparameterData
from modules.db.mongo import upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection
from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, close_experiment_logger, configure_root_logger, open_experiment_logger
from modules.runner import conduct_experiment
from modules.exceptions import CustomFlaskError, DatabaseConnectionError, GladosInternalError, ExperimentAbort, GladosUserError
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files
from modules.utils import _get_env

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    logging.error("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

ENV_FIREBASE_CREDENTIALS = "FIREBASE_KEY"
DB_COLLECTION_EXPERIMENTS = "Experiments"

# set up logger
configure_root_logger()
syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)

firebaseCredentials = credentials.Certificate(json.loads(_get_env(ENV_FIREBASE_CREDENTIALS)))
firebaseApp = firebase_admin.initialize_app(firebaseCredentials)
firebaseDb = firestore.client()
firebaseBucket = storage.bucket("gladosbase.appspot.com")

# setting up the server
MAX_WORKERS = 1 # The max number of processes
runner = ProcessPoolExecutor(MAX_WORKERS) # Runs code in parallel using MAX_WORKERS number of processes

# setting up the Flask webserver
flaskApp = Flask(__name__)
CORS(flaskApp)

syslogger.info("GLADOS Backend Started")


"""
The query to run an experiment. 

@body   experiment  The experiment's data. Must include property 'id'
@return             The status code. 200 for success, 400 for error.
"""
@flaskApp.post("/experiment")
def recv_experiment():
    data = request.get_json()
    if _check_request_integrity(data):
        # add the "run experiment" task to the queue
        runner.submit(run_batch_and_catch_exceptions, data)
        return Response(status=200)
    syslogger.error("Received malformed experiment request: %s", data)
    return Response(status=400)


"""
The query to get the size of the queue

@return     A json body with the property 'queueSize'
"""
@flaskApp.get("/queue")
def get_queue():
    # There must be a cleaner way to access this queue size...
    return jsonify({"queueSize": len(runner._pending_work_items)})


"""
A function that returns the response when an error is raised.

@param  error   The error encountered 
@return         Error code with error details.
"""
@flaskApp.errorhandler(CustomFlaskError)
def glados_custom_flask_error(error):
    return jsonify(error.to_dict()), error.status_code


"""
A function that checks if the body contains an experiment id

@param  data    Any json object
@return         True if the data contains an experiment and the experiment contains an id. Otherwise returns false
"""
def _check_request_integrity(data: typing.Any):
    try:
        return data['experiment']['id'] is not None
    except KeyError:
        return False


"""
Catches any exceptions that occur in run_batch 

@param  data    A json object that contains the property 'experiment' which contains property 'id'
@return         void
"""
def run_batch_and_catch_exceptions(data: IncomingStartRequest):
    try:
        run_batch(data)
    except Exception as err:
        syslogger.error("Unexpected exception while trying to run the experiment, this was not caught by our own code and needs to be handled better.")
        syslogger.exception(err)
        close_experiment_logger()
        # Unsafe to upload experiment logs files here
        raise err


"""
Runs the experiment

@param  data    A json object that contains the property 'experiment' which contains property 'id'
@return         void
"""
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
        explogger.exception(err)
        close_experiment_run(expId, None)
        return

    # Parse hyperaparameters into their datatype. Required to parse the rest of the experiment data
    try:
        hyperparameters: "dict[str,Parameter]" = parseRawHyperparameterData(json.loads(experimentData['hyperparameters'])['hyperparameters'])
    except (KeyError, ValueError) as err:
        if isinstance(err, KeyError):
            explogger.error("Error generating hyperparameters - hyperparameters not found in experiment object, aborting")
        else:
            explogger.error("Error generating hyperparameters - Validation error")
        explogger.exception(err)
        close_experiment_run(expId, expRef)
        return
    experimentData['hyperparameters'] = hyperparameters

    # Parsing into Datatype
    try:
        experiment = ExperimentData(**experimentData)
        experiment.postProcess = experiment.scatter
    except ValueError as err:
        explogger.error("Experiment data was not formatted correctly, aborting")
        explogger.exception(err)
        close_experiment_run(expId, expRef)
        return

    #Downloading Experiment File
    # If the program errors here after you just deleted the ExperimentFiles on your dev machine, restart the docker container, seems to be volume mount weirdness
    os.makedirs(f'ExperimentFiles/{expId}')
    os.chdir(f'ExperimentFiles/{expId}')
    filepath = download_experiment_files(experiment)

    try:
        experiment.experimentType = determine_experiment_file_type(filepath)
    except NotImplementedError as err:
        explogger.error("This is not a supported experiment file type, aborting")
        explogger.exception(err)
        os.chdir('../..')
        close_experiment_run(expId, expRef)
        return

    explogger.info(f"Generating configs and downloading to ExperimentFiles/{expId}/configFiles")

    totalExperimentRuns = generate_config_files(experiment)
    if totalExperimentRuns == 0:
        os.chdir('../..')
        explogger.exception(GladosInternalError("Error generating configs - somehow no config files were produced?"))
        close_experiment_run(expId, expRef)
        return

    experiment.totalExperimentRuns = totalExperimentRuns

    expRef.update({"totalExperimentRuns": experiment.totalExperimentRuns})

    try:
        conduct_experiment(experiment, expRef)
        post_process_experiment(experiment)
        upload_experiment_results(experiment)
    except ExperimentAbort as err:
        explogger.error(f'Experiment {expId} critical failure, not doing any result uploading or post processing')
        explogger.exception(err)
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error('Uncaught exception while running an experiment. The GLADOS code needs to be changed to handle this in a cleaner manner')
        explogger.exception(err)
    finally:
        # We need to be out of the dir for the log file upload to work
        os.chdir('../..')
        close_experiment_run(expId, expRef)


"""
Exits the experiment

@param  expId   The experiment id
@param  expRef  json object or none
@return         void
"""
def close_experiment_run(expId: DocumentId, expRef: "typing.Any | None"):
    explogger.info(f'Exiting experiment {expId}')
    if expRef:
        expRef.update({'finished': True, 'finishedAtEpochMillis': int(time.time() * 1000)})
    else:
        syslogger.warning(f'No experiment ref supplied when closing {expId} , could not update it to finished')
    close_experiment_logger()
    upload_experiment_log(expId)


"""
Determines if the type of the experiment. Accepted types are:
- Python script
- python3
- Java archive data (JAR)

@param  filepath    The path to the experiment's code
@return             The mime type of the file
"""
def determine_experiment_file_type(filepath: str):
    rawfiletype = magic.from_file(filepath)
    filetype = ExperimentType.UNKNOWN
    if 'Python script' in rawfiletype or 'python3' in rawfiletype:
        filetype = ExperimentType.PYTHON
    elif 'Java archive data (JAR)' in rawfiletype:
        filetype = ExperimentType.JAVA

    explogger.info(f"Raw Filetype: {rawfiletype}\n Filtered Filetype: {filetype.value}")

    if filetype == ExperimentType.UNKNOWN:
        explogger.error(f'File type "{rawfiletype}" could not be mapped to Python or Java, if it should consider updating the matching statements')
        raise NotImplementedError("Unknown experiment file type")
    return filetype


"""
Downloads the experiment files
Call this function when inside the experiment folder!

@param  experiment  json object of the experiment
@return             The filepath to the downloaded file
"""
def download_experiment_files(experiment: ExperimentData):
    if experiment.has_extra_files() or experiment.postProcess != '' or experiment.keepLogs:
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


"""
Uploads the experiment files
TODO: replace firebase with MongoDB 
Call this function when inside the experiment folder!

@param  experiment  json object of the experiment
@return             void
"""
def upload_experiment_results(experiment: ExperimentData):
    explogger.info('Uploading Experiment Results...')

    try:
        uploadBlob = firebaseBucket.blob(f"results/result{experiment.expId}.csv")
        uploadBlob.upload_from_filename('results.csv')
    except Exception as err:
        raise DatabaseConnectionError("Error uploading aggregated experiment results to firebase") from err

    explogger.info('Uploading to MongoDB')
    verify_mongo_connection()

    resultContent = None
    try:
        with open('results.csv', 'r', encoding="utf8") as experimentFile:
            resultContent = experimentFile.read()
    except Exception as err:
        raise GladosInternalError("Failed to read aggregated result file data for upload to mongodb") from err

    upload_experiment_aggregated_results(experiment, resultContent)

    if experiment.has_extra_files() or experiment.postProcess or experiment.keepLogs:
        explogger.info('Uploading Result Csvs')

        encoded = None
        try:
            shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')
            with open("ResultCsvs.zip", "rb") as file:
                encoded = Binary(file.read())
        except Exception as err:
            raise GladosInternalError("Error preparing experiment results zip") from err

        # TODO remove firebase usage once transition to mongo file storage is complete
        try:
            uploadBlob = firebaseBucket.blob(f"results/result{experiment.expId}.zip")
            uploadBlob.upload_from_filename('ResultCsvs.zip')
        except Exception as err:
            raise DatabaseConnectionError("Error uploading experiment results zip to firebase") from err

        upload_experiment_zip(experiment, encoded)


"""
Does post processing on the experiment. Post processing includes:
- Creating a scatter plot if enabled
Call this function when inside the experiment folder!

@param  experiment  json object of the experiment
@return             void
"""
def post_process_experiment(experiment: ExperimentData):
    if experiment.postProcess:
        explogger.info("Beginning post processing")
        try:
            if experiment.scatter:
                explogger.info("Creating Scatter Plot")
                depVar = experiment.scatterDepVar
                indVar = experiment.scatterIndVar
                generateScatterPlot(indVar, depVar, 'results.csv', experiment.expId)
        except (KeyError, ValueError) as err:
            explogger.error('Error during plot generation')
            explogger.exception(err)


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
