import os
import shutil
from subprocess import Popen, PIPE
import logging
from concurrent.futures import ProcessPoolExecutor
import sys
import csv
import json
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
from dotenv import load_dotenv

from modules.exceptions import FileHandlingError, CustomFlaskError, GladosInternalError, InternalTrialFailedError, ExperimentAbort
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files, get_config_paramNames, get_configs_ordered

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

#Constants
PIPE_OUTPUT_ERROR_MESSAGE = "ERROR"
OUTPUT_INDICATOR_USING_CSVS = "In ResCsvs"

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
    time.sleep(1)  # TODO purpose of this delay?
    print(data)
    experiments = firebaseDb.collection('Experiments')

    #Parsing the argument data
    expId = data['experiment']['id']
    print(f'received {expId}')
    expRef = experiments.document(expId)
    experiment = expRef.get().to_dict()
    experiment['id'] = expId
    experimentOutput = experiment['fileOutput']
    resultOutput = experiment['resultOutput']
    scatterPlot = experiment['scatter']
    dumbTextArea = experiment['consts']
    postProcess = scatterPlot != ''
    print(f"Experiment info: {experiment}")

    #Downloading Experiment File
    os.makedirs(f'ExperimentFiles/{expId}')
    os.chdir(f'ExperimentFiles/{expId}')
    if experimentOutput != '' or postProcess != '':
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
    finally:
        #Updating Firebase Object
        expRef.update({'finished': True, 'finishedAtEpochMillis': int(time.time() * 1000)})
        print(f'Exiting experiment {expId}')
        os.chdir('../..')


def conduct_experiment(expId, expRef, experimentOutput, resultOutput, filepath, filetype, numTrialsToRun):
    print(f"Running Experiment {expId}")
    expRef.update({"startedAtEpochMillis": int(time.time() * 1000)})
    passes = 0
    fails = 0
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = get_config_paramNames('configFiles/0.ini')
        writer = csv.writer(expResults)

        #Timing the first trial
        startSeconds = time.time()
        try:
            firstTrial = run_trial(filepath, f'configFiles/{0}.ini', filetype)
            if resultOutput == '':
                writer.writerow(["Experiment Run", "Result"] + paramNames)
            else:
                if (output := get_header_results(resultOutput)) is None:
                    raise InternalTrialFailedError("Nothing returned when trying to get header results (David, improve this error message please)")
                writer.writerow(["Experiment Run"] + output + paramNames)
        except InternalTrialFailedError as err:
            writer.writerow([0, "Error"])
            message = f"First trial of {expId} ran into an error while running, aborting the whole experiment"
            print(message)
            fails += 1
            expRef.update({'fails': fails})
            raise ExperimentAbort(message) from err
        finally:
            endSeconds = time.time()
            timeTakenMinutes = (endSeconds - startSeconds) / 60
            #Estimating time for all experiments to run and informing frontend
            estimatedTotalTimeMinutes = timeTakenMinutes * numTrialsToRun
            print(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
            expRef.update({'estimatedTotalTimeMinutes': estimatedTotalTimeMinutes})

        passes += 1
        expRef.update({'passes': passes})
        print(f"result from running first experiment: {firstTrial}")

        # The rest of the trials
        # TODO we should handle the non-error output of the first run in here too to avoid mistakes in processing them differently
        if numTrialsToRun > 0:
            #Running the rest of the experiments

            print(f"Continuing now running {numTrialsToRun}")
            if experimentOutput != '':
                add_to_output_batch(experimentOutput, 0)
                firstTrial = OUTPUT_INDICATOR_USING_CSVS
            if resultOutput == '':
                writer.writerow(["0", firstTrial] + get_configs_ordered(f'configFiles/{0}.ini', paramNames))
            else:
                if (output := get_output_results(resultOutput)) is None:
                    raise InternalTrialFailedError("Nothing returned when trying to get first non-header line of results (the first run?) (David, improve this error message please)")
                writer.writerow(["0"] + output + get_configs_ordered(f'configFiles/{0}.ini', paramNames))
            for i in range(1, numTrialsToRun + 1):
                try:
                    response_data = run_trial(filepath, f'configFiles/{i}.ini', filetype)
                except InternalTrialFailedError:
                    print('The trial failed for some internal reason?')  # TODO should this halt all further experiment runs?
                    fails += 1
                    expRef.update({'fails': fails})
                    continue

                if experimentOutput != '':
                    response_data = OUTPUT_INDICATOR_USING_CSVS
                    add_to_output_batch(experimentOutput, i)
                if resultOutput == '':
                    writer.writerow([i, response_data] + get_configs_ordered(f'configFiles/{i}.ini', paramNames))
                else:
                    output = get_output_results(resultOutput)
                    if output is None:
                        raise InternalTrialFailedError("Nothing returned when trying to get first non-header line of results (the rest of the runs?) (David, improve this error message please)")
                    writer.writerow([i] + output + get_configs_ordered(f'configFiles/{i}.ini', paramNames))
                if response_data != PIPE_OUTPUT_ERROR_MESSAGE:
                    passes += 1
                    expRef.update({'passes': passes})
                else:
                    fails += 1
                    expRef.update({'fails': fails})
        print("Finished running Experiments")


### UTILS
def run_trial(experiment_path, config_path, filetype):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    if filetype == 'python':
        with Popen(['python', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            return get_data(process)
    elif filetype == 'java':
        with Popen(['java', '-jar', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            return get_data(process)


def get_header_results(filename):
    with open(filename, mode='r', encoding="utf8") as file:
        reader = csv.reader(file)
        for line in reader:
            return line


def get_output_results(filename):
    with open(filename, mode='r', encoding="utf8") as file:
        reader = csv.reader(file)
        i = 0
        for line in reader:
            if i == 1:
                return line
            i += 1


def get_data(process: 'Popen[str]'):
    try:
        data = process.communicate()
        if data[1]:
            print(f'errors returned from pipe is {data[1]}')
            return PIPE_OUTPUT_ERROR_MESSAGE
    except Exception as e:
        raise InternalTrialFailedError("Encountered another exception while reading pipe") from e
    result = data[0].split('\n')[0]
    print(f"result data: {result}")
    return result


def add_to_output_batch(fileOutput, ExpRun):
    try:
        shutil.copy2(f'{fileOutput}', f'ResCsvs/Result{ExpRun}.csv')
    except Exception as err:
        raise FileHandlingError("Failed to copy results csv") from err


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
