import os
import shutil
import logging
from concurrent.futures import ProcessPoolExecutor
import sys
import json
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
from dotenv import load_dotenv
import pymongo
from pymongo.errors import ConnectionFailure
from bson.binary import Binary

from modules.runner import conduct_experiment
from modules.exceptions import CustomFlaskError, GladosInternalError, ExperimentAbort
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files

from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import ParamType, BoolParameter, FloatParam, IntegerParam, Parameter, StringParameter

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    print("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

# Must override so that vscode doesn't incorrectly parse another env file and have bad values
HAS_DOTENV_FILE = load_dotenv("./.env", override=True)

ENV_FIREBASE_CREDENTIALS = "FIREBASE_KEY"
DB_COLLECTION_EXPERIMENTS = 'Experiments'

FIREBASE_CREDENTIALS = os.environ.get(ENV_FIREBASE_CREDENTIALS)
if FIREBASE_CREDENTIALS is None:
    if HAS_DOTENV_FILE:
        raise AssertionError(f"Missing environment variable {ENV_FIREBASE_CREDENTIALS} in your `.env` file")
    else:
        raise AssertionError(f"Missing environment variable {ENV_FIREBASE_CREDENTIALS} - you need a `.env` file in this folder with it defined")
else:
    print("Loaded firebase credentials from environment variables")

firebaseCredentials = credentials.Certificate(json.loads(FIREBASE_CREDENTIALS))
firebaseApp = firebase_admin.initialize_app(firebaseCredentials)
firebaseDb = firestore.client()
firebaseBucket = storage.bucket("gladosbase.appspot.com")

#MongoDB Objects
DEFAULT_MONGO_PORT = 27017
mongoClient = pymongo.MongoClient('glados-mongodb', DEFAULT_MONGO_PORT, serverSelectionTimeoutMS=1000)
mongoGladosDB = mongoClient["gladosdb"]
mongoResultsCollection = mongoGladosDB.results
mongoResultsZipCollections = mongoGladosDB.zips

#setting up the app
MAX_WORKERS = 1
runner = ProcessPoolExecutor(MAX_WORKERS)

#setting up the Flask webserver (handles the uploaded experiment files)
flaskApp = Flask(__name__)
CORS(flaskApp)


@flaskApp.post("/experiment")
def recv_experiment():
    runner.submit(handle_exceptions_from_run, request.get_json())
    return 'OK'


@flaskApp.get("/queue")
def get_queue():
    # There must be a cleaner way to access this queue size...
    return jsonify({"queueSize": len(runner._pending_work_items)})


@flaskApp.errorhandler(CustomFlaskError)
def glados_custom_flask_error(error):
    return jsonify(error.to_dict()), error.status_code


def handle_exceptions_from_run(data):
    try:
        run_batch(data)
    except Exception as err:
        print(f"Unexpected exception while trying to run the experiment, this was not caught by our own code and needs to be handled better: {err}")
        logging.exception(err)
        raise err


def run_batch(data):
    print(f'Run_Batch starting with data {data}')
    experiments = firebaseDb.collection(DB_COLLECTION_EXPERIMENTS)

    # Obtain most basic experiment info
    expId = data['experiment']['id']
    print(f'received {expId}')
    expRef = experiments.document(expId)

    # Parsing the argument data
    experimentData = expRef.get().to_dict()

    try:
        hyperparameters: "dict[str,Parameter]" = parseParams(json.loads(experimentData['hyperparameters'])['hyperparameters'])
    except KeyError as err:
        raise GladosInternalError("Error generating configs - hyperparameters not found in experiment object") from err
    print(type(hyperparameters))
    experimentData['hyperparameters'] = hyperparameters

    #Parsing into Datatype
    experiment = ExperimentData(**experimentData)
    experiment.postProcess = experiment.scatter
    #Downloading Experiment File
    os.makedirs(f'ExperimentFiles/{expId}')
    os.chdir(f'ExperimentFiles/{expId}')
    filepath = download_experiment_files(experiment)

    rawfiletype, filetype = determine_experiment_file_type(filepath)
    experiment.experimentType = filetype
    print(f"Raw Filetype: {rawfiletype}\n Filtered Filetype: {filetype.value}")

    print(f"Generating configs and downloading to ExperimentFiles/{expId}/configFiles")

    totalExperimentRuns = generate_config_files(experiment)
    if totalExperimentRuns == 0:
        raise GladosInternalError("Error generating configs - somehow no config files were produced?")
    experiment.totalExperimentRuns = totalExperimentRuns

    expRef.update({"totalExperimentRuns": experiment.totalExperimentRuns})

    try:
        conduct_experiment(experiment, expRef)

        post_process_experiment(experiment)

        upload_experiment_results(experiment)
    except ExperimentAbort as err:
        print(f'Experiment {expId} critical failure, not doing any result uploading or post processing')
        logging.exception(err)
    except Exception as err:
        print(f'Uncaught exception "{err}" while running an experiment the GLADOS code needs to be changed to handle this in a cleaner manner')
        logging.exception(err)
        raise err
    finally:
        expRef.update({'finished': True, 'finishedAtEpochMillis': int(time.time() * 1000)})
        print(f'Exiting experiment {expId}')
        os.chdir('../..')


def determine_experiment_file_type(filepath):
    rawfiletype = magic.from_file(filepath)
    print(rawfiletype)
    filetype = 'unknown'
    if 'Python script' in rawfiletype or 'python3' in rawfiletype:
        filetype = ExperimentType.PYTHON
    elif 'Java archive data (JAR)' in rawfiletype:
        filetype = ExperimentType.JAVA

    if filetype == 'unknown':
        print(f"{rawfiletype} could not be mapped to python or java, if it should consider updating the matching statements")
        raise NotImplementedError("Unknown experiment file type")
    return rawfiletype, filetype


def download_experiment_files(experiment: ExperimentData):
    if experiment.trialExtraFile != '' or experiment.postProcess != '' or experiment.keepLogs:
        print('There will be experiment outputs')
        os.makedirs('ResCsvs')
    print(f'Downloading file for {experiment.expId}')

    filepath = f'experiment{experiment.expId}'
    experiment.file = filepath
    print(f"Downloading {filepath} to ExperimentFiles/{experiment.expId}/{filepath}")
    try:
        filedata = firebaseBucket.blob(filepath)
        filedata.download_to_filename(filepath)
    except Exception as err:
        print(f"Error {err} occurred while trying to download experiment file")
        raise GladosInternalError('Failed to download experiment files') from err
    print(f"Downloaded {filepath} to ExperimentFiles/{experiment.expId}/{filepath}")
    return filepath


def parseParams(hyperparameters):
    result = {}
    for param in hyperparameters:
        name = param['name']
        del param['name']
        if param['type'] == 'integer':
            param['type'] = ParamType.INTEGER
            result[name] = IntegerParam(**param)
        elif param['type'] == 'float':
            param['type'] = ParamType.FLOAT
            result[name] = FloatParam(**param)
        elif param['type'] == 'bool':
            param['type'] = ParamType.BOOL
            result[name] = BoolParameter(**param)
        elif param['type'] == 'string':
            param['type'] = ParamType.STRING
            result[name] = StringParameter(**param)
        else:
            raise GladosInternalError(f"{param['type']} is not a supported type")
    return result


def upload_experiment_results(experiment):
    print('Uploading Results to the frontend')
    uploadBlob = firebaseBucket.blob(f"results/result{experiment.expId}.csv")
    uploadBlob.upload_from_filename('results.csv')

    # Upload to MongoDB
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        raise GladosInternalError("MongoDB server not available/unreachable") from err

    print('Uploading to MongoDB')
    experimentFile = open("results.csv", encoding='utf8')  # there is probably a better way to do this
    experimentData = experimentFile.read()
    experimentFile.close()
    experimentResultEntry = {"_id": experiment.expId, "resultContent": experimentData}
    try:
        resultId = mongoResultsCollection.insert_one(experimentResultEntry).inserted_id
        print(f"inserted result csv into mongodb with id: {resultId}")
    except Exception as err:
        raise GladosInternalError("Encountered error while inserting results into MongoDB") from err
    if experiment.trialExtraFile != '' or experiment.postProcess:
        print('Uploading Result Csvs')
        try:
            shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')
            uploadBlob = firebaseBucket.blob(f"results/result{experiment.expId}.zip")
            uploadBlob.upload_from_filename('ResultCsvs.zip')

            # mongoResultsZipCollections
            with open("ResultCsvs.zip", "rb") as file:
                encoded = Binary(file.read())
            experimentZipEntry = {"_id": experiment.expId, "fileContent": encoded}
            try:
                resultZipId = mongoResultsZipCollections.insert_one(experimentZipEntry).inserted_id
                print(f"inserted zip file into mongodb with id: {resultZipId}")
            except Exception as err:
                raise GladosInternalError("Encountered error while inserting results into MongoDB") from err
        except Exception as err:
            raise GladosInternalError("Error uploading to firebase") from err


def post_process_experiment(experiment: ExperimentData):
    if experiment.postProcess:
        print("Beginning post processing")
        try:
            if experiment.scatter:
                print("Creating Scatter Plot")
                depVar = experiment.scatterDepVar
                indVar = experiment.scatterIndVar
                generateScatterPlot(indVar, depVar, 'results.csv', experiment.expId)
        except KeyError as err:
            raise GladosInternalError("Error during plot generation") from err


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
