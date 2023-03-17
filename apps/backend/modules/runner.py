import csv
import shutil
from subprocess import Popen, PIPE, TimeoutExpired
import time
import os

# from modules.data.trial import Trial
from modules.configs import get_configs_ordered
from modules.exceptions import ExperimentAbort, FileHandlingError, GladosUserError, TrialTimeoutError
from modules.exceptions import InternalTrialFailedError
from modules.configs import get_config_paramNames

PIPE_OUTPUT_ERROR_MESSAGE = "ERROR"  #TODO TURN TO EXCEPTION
OUTPUT_INDICATOR_USING_CSVS = "In ResCsvs"
PROCESS_OUT_STREAM = 0
PROCESS_ERROR_STREAM = 1


def get_data(process: 'Popen[str]', trialRun: int, keepLogs: bool, trialTimeout: int):
    try:
        data = process.communicate(timeout=trialTimeout)
        if keepLogs:
            os.chdir('ResCsvs')
            with open(f"log{trialRun}.txt", 'w', encoding='utf8') as trialLogFile:
                trialLogFile.write(data[PROCESS_OUT_STREAM])
                if data[1]:
                    trialLogFile.write(data[PROCESS_ERROR_STREAM])
                trialLogFile.close()
            os.chdir('..')
        if data[PROCESS_ERROR_STREAM]:  #TODO TURN TO EXCEPTION follow the cases below
            errorMessage = f'errors returned from pipe is {data[PROCESS_ERROR_STREAM]}'
            print(errorMessage)
            raise InternalTrialFailedError(errorMessage)
    except TimeoutExpired as timeErr:
        print(f"{timeErr} Trial timed out")
        raise TrialTimeoutError("Trial took too long to complete") from timeErr
    except Exception as err:
        print("Encountered another exception while reading pipe: {err}")
        raise InternalTrialFailedError("Encountered another exception while reading pipe") from err
    result = data[0].split('\n')[0]  #TODO ask yoder if this is still relevant
    print(f"trial#{trialRun} result data: {result}")
    return result


def run_trial(experiment_path, config_path, filetype, trialRun: int, keepLogs: bool, trialTimeout: int):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    if filetype == 'python':
        with Popen(['python', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            return get_data(process, trialRun, keepLogs, trialTimeout)
    elif filetype == 'java':
        with Popen(['java', '-jar', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            return get_data(process, trialRun, keepLogs, trialTimeout)


def get_line_n_of_trial_results_csv(lineNum, filename):
    try:
        with open(filename, mode='r', encoding="utf8") as file:
            reader = csv.reader(file)
            i = 0
            for line in reader:
                if i == lineNum:
                    return line
                i += 1
            raise GladosUserError(f"{filename} is either empty or only has one line")
    except Exception as err:  #TODO add more exception handling for blank file and 1 line file
        raise GladosUserError("Failed to read trial results csv, does the file exist? Typo in the user-specified output filename(s)?") from err

def add_to_output_batch(fileOutput, ExpRun):
    try:
        shutil.copy2(f'{fileOutput}', f'ResCsvs/Result{ExpRun}.csv')
    except Exception as err:
        raise FileHandlingError("Failed to copy results csv") from err


def conduct_experiment(expId, expRef, trialExtraFile, trialResult, filepath, filetype, numTrialsToRun, trialTimeout, keepLogs):
    print(f"Running Experiment {expId}")

    passes = 0
    fails = 0
    numOutputs = None
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = get_config_paramNames('configFiles/0.ini')
        writer = csv.writer(expResults)
        print(f"Now Running {numTrialsToRun} trials")
        for trialNum in range(0, numTrialsToRun + 1):
            startSeconds = time.time()
            expRef.update({"startedAtEpochMillis": int(startSeconds * 1000)})
            try:
                response_data = run_trial(filepath, f'configFiles/{trialNum}.ini', filetype, trialNum, keepLogs, trialTimeout)
            except InternalTrialFailedError as err:
                print(f'Internal Trial Failure {err}')  # TODO should this halt all further experiment runs?
                fails += 1
                expRef.update({'fails': fails})
                if numOutputs is not None:  #After the first trial this should be defined not sure how else to do this
                    writer.writerow([trialNum] + ["ERROR" for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
                if trialNum == 0:  #First Trial Failure Abort
                    message = f"First trial of {expId} ran into an error while running, aborting the whole experiment. Read the traceback to find out what the actual cause of this problem is (it will not necessarily be at the top of the stack trace)."
                    print(message)
                    raise ExperimentAbort(message) from err
                continue
            except TrialTimeoutError as timeoutErr:  #First Trial timeout Abort
                print(f"Trial#{trialNum} timed out")
                fails += 1
                expRef.update({'fails': fails})
                #TODO: uncomment when datatypes are added back in again
                if numOutputs is not None:  #After the first trial this should be defined not sure how else to do this
                    writer.writerow([trialNum] + ["TIMEOUT" for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
                if trialNum == 0:
                    message = f"First trial of {expId} timed out into an error while running, aborting the whole experiment."
                    print(message)
                    raise ExperimentAbort(message) from timeoutErr
                continue

            endSeconds = time.time()
            timeTakenMinutes = (endSeconds - startSeconds) / 60
            #Estimating time for all experiments to run and informing frontend

            if trialNum == 0:  #Setting up the Headers of the CSV
                estimatedTotalTimeMinutes = timeTakenMinutes * numTrialsToRun
                print(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
                expRef.update({'estimatedTotalTimeMinutes': estimatedTotalTimeMinutes})
                #Setting up the header for the Result CSV
                if trialResult == '':
                    writer.writerow(["Experiment Run", "Result"] + paramNames)
                    numOutputs = 1
                else:
                    if (output := get_line_n_of_trial_results_csv(0,trialResult)) is None:
                        raise InternalTrialFailedError("Nothing returned when trying to get header results (David, improve this error message please)")
                    numOutputs = len(output)
                    writer.writerow(["Experiment Run"] + output + paramNames)

            if trialExtraFile != '':
                response_data = OUTPUT_INDICATOR_USING_CSVS
                add_to_output_batch(trialExtraFile, trialNum)
            if trialResult == '':
                writer.writerow([trialNum, response_data] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
            else:
                output = get_line_n_of_trial_results_csv(1,trialResult)
                if output is None:
                    raise InternalTrialFailedError("Nothing returned when trying to get first non-header line of results (the rest of the runs?) (David, improve this error message please)")
                writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
            passes += 1
            expRef.update({'passes': passes})
        print("Finished running Trials")
