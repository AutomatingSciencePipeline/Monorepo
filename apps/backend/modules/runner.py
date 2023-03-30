import csv
import shutil
from subprocess import Popen, PIPE, TimeoutExpired
import time
import os

# from modules.data.trial import Trial
from modules.configs import create_config_from_data, get_configs_ordered
from modules.data.experiment import ExperimentData, ExperimentType
from modules.exceptions import ExperimentAbort, FileHandlingError, GladosInternalError, GladosUserError, TrialTimeoutError
from modules.exceptions import InternalTrialFailedError
from modules.configs import get_config_paramNames

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
        if data[PROCESS_ERROR_STREAM]:
            errorMessage = f'errors returned from pipe is {data[PROCESS_ERROR_STREAM]}'
            print(errorMessage)
            raise InternalTrialFailedError(errorMessage)
    except TimeoutExpired as timeErr:
        print(f"{timeErr} Trial timed out")
        raise TrialTimeoutError("Trial took too long to complete") from timeErr
    except Exception as err:
        print("Encountered another exception while reading pipe: {err}")
        raise InternalTrialFailedError("Encountered another exception while reading pipe") from err


def run_trial(experiment: ExperimentData, config_path, trialRun: int):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    if experiment.experimentType == ExperimentType.PYTHON:
        with Popen(['python', experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            get_data(process, trialRun, experiment.keepLogs, experiment.timeout)
    elif experiment.experimentType == ExperimentType.JAVA:
        with Popen(['java', '-jar', experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            get_data(process, trialRun, experiment.keepLogs, experiment.timeout)


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


def conduct_experiment(experiment: ExperimentData, expRef):
    os.mkdir('configFiles')
    print(f"Running Experiment {experiment.expId}")

    experiment.passes = 0
    experiment.fails = 0
    numOutputs = None
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = []
        writer = csv.writer(expResults)
        print(f"Now Running {experiment.totalExperimentRuns} trials")
        for trialNum in range(0, experiment.totalExperimentRuns):
            startSeconds = time.time()
            expRef.update({"startedAtEpochMillis": int(startSeconds * 1000)})

            try:
                configFileName = create_config_from_data(experiment, trialNum)
                paramNames = get_config_paramNames('configFiles/0.ini')
            except Exception as err:
                msg = f"Failed to generate config {trialNum} file"
                raise GladosInternalError(msg) from err

            try:
                run_trial(experiment, f'configFiles/{configFileName}', trialNum)
            except InternalTrialFailedError as err:
                print(f'Trial#{trialNum} Encountered an Error')
                experiment.fails += 1
                expRef.update({'fails': experiment.fails})
                if numOutputs is not None:  #After the first trial this should be defined not sure how else to do this
                    writer.writerow([trialNum] + ["ERROR" for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
                if trialNum == 0:  #First Trial Failure Abort
                    message = f"First trial of {experiment.expId} ran into an error while running, aborting the whole experiment. Read the traceback to find out what the actual cause of this problem is (it will not necessarily be at the top of the stack trace)."
                    print(message)
                    raise ExperimentAbort(message) from err
                continue
            except TrialTimeoutError as timeoutErr:  #First Trial timeout Abort
                print(f"Trial#{trialNum} timed out")
                experiment.fails += 1
                expRef.update({'fails': experiment.fails})
                if numOutputs is not None:  #After the first trial this should be defined not sure how else to do this
                    writer.writerow([trialNum] + ["TIMEOUT" for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
                if trialNum == 0:
                    message = f"First trial of {experiment.expId} timed out into an error while running, aborting the whole experiment."
                    print(message)
                    raise ExperimentAbort(message) from timeoutErr
                continue

            endSeconds = time.time()
            timeTakenMinutes = (endSeconds - startSeconds) / 60
            #Estimating time for all experiments to run and informing frontend

            if trialNum == 0:  #Setting up the Headers of the CSV
                estimatedTotalTimeMinutes = timeTakenMinutes * experiment.totalExperimentRuns
                print(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
                expRef.update({'estimatedTotalTimeMinutes': estimatedTotalTimeMinutes})
                #Setting up the header for the Result CSV
                if (output := get_line_n_of_trial_results_csv(0, experiment.trialResult)) is None:
                    raise InternalTrialFailedError("Nothing returned when trying to get header results (David, improve this error message please)")
                numOutputs = len(output)
                writer.writerow(["Experiment Run"] + output + paramNames)

            if experiment.trialExtraFile != '':
                add_to_output_batch(experiment.trialExtraFile, trialNum)

            output = get_line_n_of_trial_results_csv(1, experiment.trialResult)
            if output is None:
                raise InternalTrialFailedError("Nothing returned when trying to get first non-header line of results (the rest of the runs?) (David, improve this error message please)")
            # writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
            writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))

            print(f'Trial#{trialNum} completed')
            experiment.passes += 1
            expRef.update({'passes': experiment.passes})
        print("Finished running Trials")
