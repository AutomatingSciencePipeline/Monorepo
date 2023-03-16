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
import base64
import bson
from bson.binary import Binary

from modules.runner import conduct_experiment
from modules.exceptions import CustomFlaskError, GladosInternalError, ExperimentAbort
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    print("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

# Must override so that vscode doesn't incorrectly parse another env file and have bad values
HAS_DOTENV_FILE = load_dotenv("./.env", override=True)

ENV_FIREBASE_CREDENTIALS = "FIREBASE_KEY"

FIREBASE_CREDENTIALS = os.environ.get(ENV_FIREBASE_CREDENTIALS)
if FIREBASE_CREDENTIALS is None:
    if HAS_DOTENV_FILE:
        raise AssertionError(f"Missing environment variable {ENV_FIREBASE_CREDENTIALS} in your `.env` file")
    else:
        raise AssertionError(f"Missing environment variable {ENV_FIREBASE_CREDENTIALS} - you need a `.env` file in this folder with it defined")
else:
    print("Loaded firebase credentials from environment variables")

#Firebase Objects
firebaseCredentials = credentials.Certificate(json.loads(FIREBASE_CREDENTIALS))
firebaseApp = firebase_admin.initialize_app(firebaseCredentials)
firebaseDb = firestore.client()
firebaseBucket = storage.bucket("gladosbase.appspot.com")


#MongoDB Objects
mongoClient = pymongo.MongoClient('glados-mongodb', 27017, serverSelectionTimeoutMS=1000)
mongoGladosDB = mongoClient["gladosdb"]
mongoResultsCollection = mongoGladosDB.results
mongoResultsZipCollections = mongoGladosDB.zips


#setting up the app
MAX_WORKERS = 1
runner = ProcessPoolExecutor(MAX_WORKERS)
DB_COLLECTION_EXPERIMENTS = 'Experiments'

#setting up the Flask webserver (handles the uploaded experiment files)
flaskApp = Flask(__name__)
CORS(flaskApp)

MAX_WORKERS = 1
runner = ProcessPoolExecutor(MAX_WORKERS)


### FLASK API ENDPOINT
@flaskApp.post("/experiment")
def recv_experiment():
    runner.submit(handle_exceptions_from_run, request.get_json())
    return 'OK'


@flaskApp.get("/queue")
def get_queue():
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
    experiments = firebaseDb.collection('Experiments')

    # Obtain most basic experiment info
    expId = data['experiment']['id']
    print(f'received {expId}')
    expRef = experiments.document(expId)

    # Parsing the argument data
    experiment = expRef.get().to_dict()
    print(f"Experiment info: {experiment}")
    experiment['id'] = expId
    trialExtraFile = experiment['trialExtraFile']
    trialResult = experiment['trialResult']
    keepLogs = experiment['keepLogs']
    trialTimeout = int(experiment['timeout'])
    scatterPlot = experiment['scatter']
    dumbTextArea = experiment['consts']
    postProcess = scatterPlot != ''

    #Downloading Experiment File
    os.makedirs(f'ExperimentFiles/{expId}')
    os.chdir(f'ExperimentFiles/{expId}')
    filepath = download_experiment_files(expId, experiment, trialExtraFile, keepLogs, postProcess)

    #Determining experiment FileType -> how we need to execute it
    rawfiletype, filetype = determine_experiment_file_type(filepath)
    print(f"Raw Filetype: {rawfiletype}\n Filtered Filetype: {filetype}")

    #Generating Configs from hyperparameters
    print(f"Generating configs and downloading to ExperimentFiles/{expId}/configFiles")
    configResult = generate_config_files(json.loads(experiment['params'])['params'], dumbTextArea)
    if configResult is None:
        raise GladosInternalError("Error generating configs - somehow no config files were produced?")
    numExperimentsToRun = len(configResult) - 1

    #Updating with run information
    expRef.update({"totalExperimentRuns": numExperimentsToRun + 1})

    try:
        #Running the Experiment
        conduct_experiment(expId, expRef, trialExtraFile, trialResult, filepath, filetype, numExperimentsToRun, trialTimeout, keepLogs)

        # Post Processing
        post_process_experiment(expId, experiment, scatterPlot, postProcess)

        #Uploading Experiment Results
        upload_experiment_results(expId, trialExtraFile, postProcess)
    except ExperimentAbort as err:
        print(f'Experiment {expId} critical failure, not doing any result uploading or post processing')
        logging.exception(err)
    except Exception as err:
        print(f'Uncaught exception "{err}," the GLADOS code needs to be changed to handle this in a cleaner manner')
        logging.exception(err)
        raise err
    finally:
        #Updating Firebase Object
        expRef.update({'finished': True, 'finishedAtEpochMillis': int(time.time() * 1000)})
        print(f'Exiting experiment {expId}')
        os.chdir('../..')


def determine_experiment_file_type(filepath):
    rawfiletype = magic.from_file(filepath)
    print(rawfiletype)
    filetype = 'unknown'
    if 'Python script' in rawfiletype or 'python3' in rawfiletype:
        filetype = 'python'
    elif 'Java archive data (JAR)' in rawfiletype:
        filetype = 'java'

    if filetype == 'unknown':
        print(f"{rawfiletype} could not be mapped to python or java, if it should consider updating the matching statements")
        raise NotImplementedError("Unknown experiment file type")
    return rawfiletype, filetype


def download_experiment_files(expId, experiment, trialExtraFile, keepLogs, postProcess):
    if trialExtraFile != '' or postProcess != '' or keepLogs:
        print('There will be experiment outputs')
        os.makedirs('ResCsvs')
    print(f'Downloading file for {expId}')
    try:
        filepath = experiment['file']
    except KeyError:
        filepath = f'experiment{expId}'
        print(f"No filepath specified so defaulting to {filepath}")
    print(f"Downloading {filepath} to ExperimentFiles/{expId}/{filepath}")
    try:
        filedata = firebaseBucket.blob(filepath)
        filedata.download_to_filename(filepath)
    except Exception as err:
        print(f"Error {err} occurred while trying to download experiment file")
        raise GladosInternalError('Failed to download experiment files') from err
    print(f"Downloaded {filepath} to ExperimentFiles/{expId}/{filepath}")
    return filepath


def upload_experiment_results(expId, trialExtraFile, postProcess):
    print('Uploading Results to the frontend')
    uploadBlob = firebaseBucket.blob(f"results/result{expId}.csv")
    uploadBlob.upload_from_filename('results.csv')

    # Upload to MongoDB
    try:
            mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        raise GladosInternalError("MongoDB server not available/unreachable") from err
        
    
    print('Uploading to MongoDB')
    experimentFile = open(f"results.csv") # there is probably a better way to do this
    experimentData = experimentFile.read()
    experimentFile.close()
    experimentResultEntry = {"_id": expId,
                        "resultContent": experimentData}
    try:
        resultId = mongoResultsCollection.insert_one(experimentResultEntry).inserted_id
        print(f"inserted result csv into mongodb with id: {resultId}")
    except Exception as err:
        raise GladosInternalError("Encountered error while inserting results into MongoDB") from err
    if trialExtraFile != '' or postProcess:
        print('Uploading Result Csvs')
        try:
            shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')
            uploadBlob = firebaseBucket.blob(f"results/result{expId}.zip")
            uploadBlob.upload_from_filename('ResultCsvs.zip')
            
            # mongoResultsZipCollections
            with open("ResultCsvs.zip", "rb") as file:
                encoded = Binary(file.read())
            experimentZipEntry = {"_id": expId,
                            "fileContent": encoded}
            try:
                resultZipId = mongoResultsZipCollections.insert_one(experimentZipEntry).inserted_id
                print(f"inserted zip file into mongodb with id: {resultZipId}")
            except Exception as err:
                raise GladosInternalError("Encountered error while inserting results into MongoDB") from err
        except Exception as err:
            raise GladosInternalError("Error uploading to firebase") from err


def post_process_experiment(expId, experiment, scatterPlot, postProcess):
    if postProcess:
        print("Beginning post processing")
        try:
            if scatterPlot:
                print("Creating Scatter Plot")
                depVar = experiment['scatterDepVar']
                indVar = experiment['scatterIndVar']
                generateScatterPlot(indVar, depVar, 'results.csv', expId)
        except KeyError as err:
            raise GladosInternalError("Error during plot generation") from err


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
