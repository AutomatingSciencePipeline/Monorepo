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
from modules.logging.gladosLogging import get_experiment_logger

PROCESS_OUT_STREAM = 0
PROCESS_ERROR_STREAM = 1

explogger = get_experiment_logger()


def _get_data(process: 'Popen[str]', trialRun: int, keepLogs: bool, trialTimeout: int):
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
            explogger.error(errorMessage)
            raise InternalTrialFailedError(errorMessage)
    except TimeoutExpired as timeErr:
        explogger.error(f"{timeErr} Trial timed out")
        raise TrialTimeoutError("Trial took too long to complete") from timeErr
    except Exception as err:
        explogger.error("Encountered another exception while reading pipe: {err}")
        raise InternalTrialFailedError("Encountered another exception while reading pipe") from err


def _run_trial(experiment: ExperimentData, config_path: str, trialRun: int):
    """
    make sure that the cwd is ExperimentsFiles/{ExperimentId}
    """
    if experiment.experimentType == ExperimentType.PYTHON:
        with Popen(['python', experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.keepLogs, experiment.timeout)
    elif experiment.experimentType == ExperimentType.JAVA:
        with Popen(['java', '-jar', experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.keepLogs, experiment.timeout)


def _get_line_n_of_trial_results_csv(targetLineNumber: int, filename: str):
    try:
        with open(filename, mode='r', encoding="utf8") as file:
            reader = csv.reader(file)
            lineNum = 0
            for line in reader:
                if lineNum == targetLineNumber:
                    return line
                lineNum += 1

            if lineNum == 0:
                raise GladosUserError(f"{filename} is an empty file cannot gather any information")
            if lineNum == 1:
                raise GladosUserError(f"{filename} only has one line. Potentially only has a Header or Value row?")
            raise GladosInternalError(f"Failed to get line {targetLineNumber} of {filename}")
    except Exception as err:
        raise GladosUserError("Failed to read trial results csv, does the file exist? Typo in the user-specified output filename(s)?") from err


def _add_to_output_batch(fileOutput, ExpRun):
    try:
        shutil.copy2(f'{fileOutput}', f'ResCsvs/Result{ExpRun}.csv')
    except Exception as err:
        raise FileHandlingError("Failed to copy results csv, Maybe there was a typo in the filepath") from err


def conduct_experiment(experiment: ExperimentData, expRef):
    """
    Call this function when inside the experiment folder!
    """
    os.mkdir('configFiles')
    explogger.info(f"Running Experiment {experiment.expId}")

    numOutputs = 0
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = []
        writer = csv.writer(expResults)
        explogger.info(f"Now Running {experiment.totalExperimentRuns} trials")
        for trialNum in range(0, experiment.totalExperimentRuns):
            startSeconds = time.time()
            if trialNum == 0:
                expRef.update({"startedAtEpochMillis": int(startSeconds * 1000)})

            try:
                configFileName = create_config_from_data(experiment, trialNum)
                paramNames = get_config_paramNames('configFiles/0.ini')
            except Exception as err:
                raise GladosInternalError(f"Failed to generate config {trialNum} file") from err

            try:
                _run_trial(experiment, f'configFiles/{configFileName}', trialNum)
            except (TrialTimeoutError, InternalTrialFailedError) as err:
                _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                continue

            endSeconds = time.time()
            timeTakenMinutes = (endSeconds - startSeconds) / 60

            if trialNum == 0:
                estimatedTotalTimeMinutes = timeTakenMinutes * experiment.totalExperimentRuns
                explogger.info(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
                expRef.update({'estimatedTotalTimeMinutes': estimatedTotalTimeMinutes})

                try:
                    csvHeader = _get_line_n_of_trial_results_csv(0, experiment.trialResult)
                except GladosUserError as err:
                    _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                    return
                numOutputs = len(csvHeader)
                writer.writerow(["Experiment Run"] + csvHeader + paramNames)

            if experiment.has_extra_files():
                _add_to_output_batch(experiment.trialExtraFile, trialNum)

            try:
                output = _get_line_n_of_trial_results_csv(1, experiment.trialResult)
            except GladosUserError as err:
                _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                continue
            writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))

            explogger.info(f'Trial#{trialNum} completed')
            experiment.passes += 1
            expRef.update({'passes': experiment.passes})
        explogger.info("Finished running Trials")


def _handle_trial_error(experiment: ExperimentData, expRef, numOutputs: int, paramNames: "list", writer, trialNum: int, err: BaseException):
    csvErrorValue = None
    if isinstance(err, TrialTimeoutError):
        csvErrorValue = "TIMEOUT"
        explogger.error(f"Trial#{trialNum} timed out")
    else:
        csvErrorValue = "ERROR"
        explogger.error(f'Trial#{trialNum} Encountered an Error')
    explogger.exception(err)
    experiment.fails += 1
    expRef.update({'fails': experiment.fails})
    if trialNum == 0:
        message = f"First trial of {experiment.expId} ran into an error while running, aborting the whole experiment. Read the traceback to find out what the actual cause of this problem is (it will not necessarily be at the top of the stack trace)."
        explogger.error(message)
        raise ExperimentAbort(message) from err
    else:
        writer.writerow([trialNum] + [csvErrorValue for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
