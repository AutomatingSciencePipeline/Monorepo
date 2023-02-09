import os
import shutil
from subprocess import Popen, PIPE
import logging
from concurrent.futures import ProcessPoolExecutor
import sys
import itertools
import csv
import json
import time
import configparser
from flask import Flask, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
from dotenv import load_dotenv

import plots

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
DEFAULT_STEP_INT = 1
DEFAULT_STEP_FLOAT = 0.1
PIPE_OUTPUT_ERROR_MESSAGE = "ERROR"

### FLASK API ENDPOINT
runner = ProcessPoolExecutor(1)


@flaskApp.post("/experiment")
def recv_experiment():
    runner.submit(run_batch, request.get_json())
    return 'OK'


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
        #TODO update w/ error and return
        print(f'Ran into {err} while trying to download experiment')
        raise err

    #Determining FileType
    rawfiletype = magic.from_file(filepath)
    filetype = 'unknown'
    if 'Python script' in rawfiletype:
        filetype = 'python'
    elif 'Java archive data (JAR)' in rawfiletype:
        filetype = 'java'

    if filetype == 'unknown':
        #TODO return and update with error
        raise Exception("Filetype Unknown")
    print(f"Raw Filetype: {rawfiletype}\n Filtered Filetype: {filetype}")

    #Generating Configs from hyperparameters
    print(f"Generating configs and downloading to ExperimentFiles/{expId}/configFiles")
    configResult = gen_configs(json.loads(experiment['params'])['params'], dumbTextArea)
    if configResult is None:
        #TODO return and exit with error
        raise Exception("Error generating configs - somehow no configs were produced")
    numExperimentsToRun = len(configResult) - 1

    #Updating with run information
    expRef.update({"runs": numExperimentsToRun + 1})

    #Running the Experiment
    print(f"Running Experiment {expId}")
    passes = 0
    fails = 0
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = get_config_paramNames('configFiles/0.ini')
        writer = csv.writer(expResults)

        #Timing the first experiment
        startSeconds = time.time()
        firstRun = run_experiment(filepath, f'configFiles/{0}.ini', filetype)
        endSeconds = time.time()
        timeTakenMinutes = (endSeconds - startSeconds) / 60
        if resultOutput == '':
            writer.writerow(["Experiment Run", "Result"] + paramNames)
        else:
            if (output := get_header_results(resultOutput)) is None:
                #TODO update and return with error
                raise Exception("Output error 1")
            writer.writerow(["Experiment Run"] + output + paramNames)
        if firstRun == PIPE_OUTPUT_ERROR_MESSAGE:
            writer.writerow([0, "Error"])
            print(f"Experiment {expId} ran into an error while running aborting")
            fails += 1
        elif numExperimentsToRun > 0:
            #Running the rest of the experiments
            #Estimating time for all experiments to run and informing frontend
            estimatedTotalTimeMinutes = timeTakenMinutes * numExperimentsToRun
            print(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
            expRef.update({'estimatedTotalTimeMinutes': estimatedTotalTimeMinutes})

            print(f"result from running first experiment: {firstRun}\n Continuing now running {numExperimentsToRun}")
            if experimentOutput != '':
                add_to_batch(experimentOutput, 0)
                firstRun = "In ResCsvs"
            if resultOutput == '':
                writer.writerow(["0", firstRun] + get_configs_ordered(f'configFiles/{0}.ini', paramNames))
            else:
                if (output := get_output_results(resultOutput)) is None:
                    #TODO update and return with error
                    raise Exception("Output error 2")
                writer.writerow(["0"] + output + get_configs_ordered(f'configFiles/{0}.ini', paramNames))
            for i in range(1, numExperimentsToRun + 1):
                res = run_experiment(filepath, f'configFiles/{i}.ini', filetype)
                if experimentOutput != '':
                    res = 'In ResCsvs'
                    add_to_batch(experimentOutput, i)
                if resultOutput == '':
                    writer.writerow([i, res] + get_configs_ordered(f'configFiles/{i}.ini', paramNames))
                else:
                    output = get_output_results(resultOutput)
                    if output is None:
                        #TODO update and return with error
                        raise Exception("Output error 3")
                    writer.writerow([i] + output + get_configs_ordered(f'configFiles/{i}.ini', paramNames))
                if res != PIPE_OUTPUT_ERROR_MESSAGE:
                    passes += 1
                else:
                    fails += 1
        passes += 1
        print("Finished running Experiments")

    if postProcess:
        print("Beginning post processing")
        try:
            if scatterPlot:
                print("Creating Scatter Plot")
                depVar = experiment['scatterDepVar']
                indVar = experiment['scatterIndVar']
                plots.scatterPlot(indVar, depVar, 'results.csv', expId)
        except KeyError as err:
            print(f"error during plot generation: {err}")

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
            raise Exception("Error uploading to firebase") from err

    #Updating Firebase Object
    expRef.update({'finished': True, 'passes': passes, 'fails': fails})
    print(f'Exiting experiment {expId}')
    os.chdir('../..')


### UTILS
def run_experiment(experiment_path, config_path, filetype):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    if filetype == 'python':
        with Popen(['python', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as p:
            return get_data(p)
    elif filetype == 'java':
        with Popen(['java', '-jar', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as p:
            return get_data(p)


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


def get_data(p):
    try:
        data = p.communicate()
        if data[1]:
            print(f'errors returned from pipe is {data[1]}')
            return PIPE_OUTPUT_ERROR_MESSAGE
    # pylint: disable-next=broad-except # TODO do we want this to be able to catch any exception and consider it an experiment error?
    except Exception as e:
        print("Encountered another exception while reading pipe")
        print(e)
        return PIPE_OUTPUT_ERROR_MESSAGE
    result = data[0].split('\n')[0]
    print(f"result data: {result}")
    return result


def add_to_batch(fileOutput, ExpRun):
    try:
        shutil.copy2(f'{fileOutput}', f'ResCsvs/Result{ExpRun}.csv')
    except Exception as err:
        raise Exception("Failed to copy results csv") from err


def get_config_paramNames(configfile):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = list(config['DEFAULT'].keys())
    res.sort()
    return res


def get_configs_ordered(configfile, names):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = [config["DEFAULT"][key] for key in names]
    return res


def frange(start, stop, step=None):
    if step is None:
        step = 1.0
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1


def gen_list(otherVar, paramspos):
    if otherVar['type'] == 'integer':
        step = DEFAULT_STEP_INT if otherVar['step'] == '' or int(otherVar['step']) == 0 else otherVar['step']
        if otherVar['max'] == otherVar['min']:
            otherVar['max'] = int(otherVar['max']) + int(step)
        paramspos.append([(otherVar['name'], i) for i in range(int(otherVar['min']), int(otherVar['max']), int(step))])
    elif otherVar['type'] == 'float':
        step = DEFAULT_STEP_FLOAT if otherVar['step'] == '' or float(otherVar['step']) == 0 else otherVar['step']
        if otherVar['max'] == otherVar['min']:
            otherVar['max'] = float(otherVar['max']) + float(step)
        paramspos.append([(otherVar['name'], i) for i in frange(float(otherVar['min']), float(otherVar['max']), float(step))])
    elif otherVar['type'] == 'string':
        paramspos.append([(otherVar['name'], otherVar['default'])])
    elif otherVar['type'] == 'bool':
        paramspos.append([(otherVar['name'], val) for val in [True, False]])


def gen_configs(hyperparams, unparsedConstInfo):
    os.mkdir('configFiles')
    os.chdir('configFiles')
    configIdNumber = 0
    constants = gen_consts(unparsedConstInfo)
    parameters = []
    configs = []
    for param in hyperparams:
        try:
            if (param['type'] == 'integer' or param['type'] == 'float') and param['min'] == param['max']:
                print('param ' + param['name'] + ' has the same min and max value converting to constant')
                constants[param['name']] = param['min']
            elif param['type'] == 'string':
                print('param ' + param['name'] + ' is a string, adding to constants')
                constants[param['name']] = param['default']
            else:
                print('param ' + param['name'] + ' varies, adding to batch')
                parameters.append(param)
        except KeyError as err:
            raise Exception(f'{err} during finding constants') from err

    for defaultVar in parameters:
        print(f'Keeping {defaultVar} constant')
        try:
            paramspos = []
            default = [(defaultVar['name'], defaultVar['default'])]
            paramspos.append(default)
        except KeyError as err:
            print(f"Some sorta error with accessing default {err}")
            return None
        for otherVar in hyperparams:
            if otherVar['name'] != defaultVar['name']:
                try:
                    gen_list(otherVar, paramspos)
                except KeyError as err:
                    raise Exception(f'error {err} during list generation') from err
        try:
            permutations = list(itertools.product(*paramspos))
        except Exception as err:
            raise Exception(f"Error {err} while making permutations") from err
        for thisPermutation in permutations:
            outputConfig = configparser.ConfigParser()
            outputConfig.optionxform = str  # type: ignore # Must use this to make the file case sensitive, but type checker is unhappy without this ignore rule
            configItems = {}
            for item in thisPermutation:
                configItems[item[0]] = item[1]
            configItems.update(constants)
            configs.append(configItems)
            outputConfig["DEFAULT"] = configItems
            with open(f'{configIdNumber}.ini', 'w', encoding="utf8") as configFile:
                outputConfig.write(configFile)
                configFile.close()
                print(f"Finished writing config {configIdNumber}")
            configIdNumber += 1
    os.chdir('..')
    print("Finished generating configs")
    return configs


def gen_consts(toParse: str):
    res = {}
    if toParse != '':
        parsedLst = toParse.split('\n')
        #Splits each element of the parsed list on = then strips extra white space, programming scheme style! (Sorry Rob)
        fullyParsed = list(map(lambda unparsedConst: map(lambda ind: ind.strip(), unparsedConst.split('=')), parsedLst))
        for const, val in fullyParsed:
            res[const] = val
    return res


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    os.chdir('/app/GLADOS_HOME')
    flaskApp.run()
