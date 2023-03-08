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

#setting up the app
flaskApp = Flask(__name__)
CORS(flaskApp)

runner = ProcessPoolExecutor(1)


### FLASK API ENDPOINT
@flaskApp.post("/experiment")
def recv_experiment():
    runner.submit(run_batch, request.get_json())
    return 'OK'


@flaskApp.errorhandler(CustomFlaskError)
def glados_custom_flask_error(error):
    return jsonify(error.to_dict()), error.status_code


def run_batch(data):
    print(f'Run_Batch starting with data {data}')
    experiments = firebaseDb.collection('Experiments')

    #Parsing the argument data
    expId = data['experiment']['id']
    print(f'received {expId}')
    expRef = experiments.document(expId)
    experiment = expRef.get().to_dict()
    print(f"Experiment info: {experiment}")
    experiment['id'] = expId
    experimentOutput = experiment['fileOutput']
    resultOutput = experiment['resultOutput']
    keepLogs = experiment['keepLogs']
    scatterPlot = experiment['scatter']
    dumbTextArea = experiment['consts']
    postProcess = scatterPlot != ''

    #Downloading Experiment File
    os.makedirs(f'ExperimentFiles/{expId}')
    os.chdir(f'ExperimentFiles/{expId}')
    if experimentOutput != '' or postProcess != '' or keepLogs:
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
        raise GladosInternalError('Failed to download experiment files') from err

    #Determining FileType
    rawfiletype = magic.from_file(filepath)
    filetype = 'unknown'
    if 'Python script' in rawfiletype:
        filetype = 'python'
    elif 'Java archive data (JAR)' in rawfiletype:
        filetype = 'java'

    if filetype == 'unknown':
        raise NotImplementedError("Unknown experiment file type")
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
        conduct_experiment(expId, expRef, experimentOutput, resultOutput, filepath, filetype, numExperimentsToRun)
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

        #Uploading Experiment Results
        print('Uploading Results to the frontend')
        uploadBlob = firebaseBucket.blob(f"results/result{expId}.csv")
        uploadBlob.upload_from_filename('results.csv')

        if experimentOutput != '' or postProcess:
            print('Uploading Result Csvs')
            try:
                shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')
                uploadBlob = firebaseBucket.blob(f"results/result{expId}.zip")
                uploadBlob.upload_from_filename('ResultCsvs.zip')
            except Exception as err:
                raise GladosInternalError("Error uploading to firebase") from err
    except ExperimentAbort as err:
        print(f'Experiment {expId} critical failure, not doing any result uploading or post processing')
    except Exception as err:
        print(f'Uncaught exception "{err}," the GLADOS code needs to be changed to handle this, not doing any result uploading or post processing')
        logging.exception(err)
        raise err
    finally:
        #Updating Firebase Object
        expRef.update({'finished': True, 'finishedAtEpochMillis': int(time.time() * 1000)})
        print(f'Exiting experiment {expId}')
        os.chdir('../..')


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
