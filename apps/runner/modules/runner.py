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
from modules.utils import update_exp_value

from concurrent.futures import ProcessPoolExecutor, as_completed

PROCESS_OUT_STREAM = 0
PROCESS_ERROR_STREAM = 1

explogger = get_experiment_logger()


def _get_data(process: 'Popen[str]', trialRun: int, keepLogs: bool, trialTimeout: int):
    try:
        data = process.communicate(timeout=trialTimeout)
        if keepLogs:
            os.chdir('../ResCsvs')
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
    make sure that the cwd is ExperimentsFiles/{ExperimentId}/trial{trialNum}
    """
    # set the paths
    os.mkdir(f'trial{trialRun}')
    os.chdir(f'trial{trialRun}')
    if experiment.experimentType == ExperimentType.PYTHON:
        with Popen(['python', "../" + experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.keepLogs, experiment.timeout)
    elif experiment.experimentType == ExperimentType.JAVA:
        with Popen(['java', '-jar', "../" + experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.keepLogs, experiment.timeout)
    elif experiment.experimentType == ExperimentType.C:
        Popen(['chmod', '+x', "../" + experiment.file], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8')
        with Popen(['../' + experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
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


def _add_to_output_batch(trialExtraFile: str, ExpRun: int):
    try:
        # check if this is directory
        if os.path.isdir(trialExtraFile):
            extraFileName = trialExtraFile.split('/')[-1]
            if extraFileName == "":
                extraFileName = trialExtraFile.split('/')[-2]
            # recursively copy the directory
            shutil.copytree(trialExtraFile, f'ResCsvs/{extraFileName}{ExpRun}')
        else:
            extraFileName = trialExtraFile.split('/')[-1].split('.')[0]
            shutil.copy2(f'{trialExtraFile}', f'ResCsvs/{extraFileName}{ExpRun}.csv')
    except Exception as err:
        explogger.error(f"Expected to find trial extra file at {trialExtraFile}")
        raise FileHandlingError("Failed to copy results csv. Maybe there was a typo in the filepath?") from err
   
    
def _run_trial_zero(experiment: ExperimentData, trialNum: int):
    with open('results.csv', 'w', encoding="utf8") as expResults:
        writer = csv.writer(expResults)
        explogger.info(f"Running Trial {trialNum}")
        paramNames = get_config_paramNames('configFiles/0.ini')
        numOutputs = 0
        
        startSeconds = time.time()
        if trialNum == 0:
            update_exp_value(experiment.expId, "startedAtEpochMillis", int(startSeconds * 1000))
        try:
            configFileName = create_config_from_data(experiment, trialNum)
            paramNames = get_config_paramNames('configFiles/0.ini')
        except Exception as err:
            raise GladosInternalError(f"Failed to generate config {trialNum} file") from err
                
        try:
            _run_trial(experiment, f'../configFiles/{configFileName}', trialNum)
        except (TrialTimeoutError, InternalTrialFailedError) as err:
            _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)
            return

        endSeconds = time.time()
        timeTakenMinutes = (endSeconds - startSeconds) / 60

        if trialNum == 0:
            estimatedTotalTimeMinutes = timeTakenMinutes * experiment.totalExperimentRuns
            explogger.info(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
            update_exp_value(experiment.expId, 'estimatedTotalTimeMinutes', estimatedTotalTimeMinutes)

            try:
                csvHeader = _get_line_n_of_trial_results_csv(0, f"trial{trialNum}/" + experiment.trialResult)
            except GladosUserError as err:
                _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)
                return
            numOutputs = len(csvHeader)
            writer.writerow(["Experiment Run"] + csvHeader + paramNames)

        if experiment.has_extra_files() and experiment.trialExtraFile != None:
            try:
                _add_to_output_batch(f"trial{trialNum}/" + experiment.trialExtraFile, trialNum)
            except FileHandlingError as err:
                _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)                    
                return

        try:
            output = _get_line_n_of_trial_results_csv(1, f"trial{trialNum}/" + experiment.trialResult)
        except GladosUserError as err:
            _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)
            return
        writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))

        explogger.info(f'Trial#{trialNum} completed')
        experiment.passes += 1
        update_exp_value(experiment.expId, 'passes', experiment.passes)
     
        
def _run_trial_wrapper(experiment: ExperimentData, trialNum: int):
    explogger.info(f"Running Trial {trialNum}")
    paramNames = get_config_paramNames('configFiles/0.ini')
    numOutputs = 0

    try:
        configFileName = create_config_from_data(experiment, trialNum)
        paramNames = get_config_paramNames('configFiles/0.ini')
    except Exception as err:
        raise GladosInternalError(f"Failed to generate config {trialNum} file") from err
               
    try:
        _run_trial(experiment, f'../configFiles/{configFileName}', trialNum)
    except (TrialTimeoutError, InternalTrialFailedError) as err:
        _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)
        return

    if experiment.has_extra_files() and experiment.trialExtraFile != None:
        try:
            _add_to_output_batch(f"trial{trialNum}/" + experiment.trialExtraFile, trialNum)
        except FileHandlingError as err:
            _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)                    
            return

    try:
        output = _get_line_n_of_trial_results_csv(1, f"trial{trialNum}/" + experiment.trialResult)
    except GladosUserError as err:
        _handle_trial_error(experiment, numOutputs, paramNames, None, trialNum, err)
        return
    
    # return the object that will be written to a row
    return [trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames)


def conduct_experiment(experiment: ExperimentData):
    """
    Call this function when inside the experiment folder!
    """
    os.mkdir('configFiles')
    explogger.info(f"Running Experiment {experiment.expId}")
    explogger.info(f"Now Running {experiment.totalExperimentRuns} trials")
    
    trialNums = []
    
    for i in range(experiment.totalExperimentRuns):
        if i != 0:
            trialNums.append(i)
            
    # run trial run 0
    _run_trial_zero(experiment, 0)
    results = []
    
    with ProcessPoolExecutor() as executor:
        # run all of the experiments
        futures = [executor.submit(_run_trial_wrapper, experiment, trialNum) for trialNum in trialNums]
        # Wait for all tasks to complete
        for future in as_completed(futures):
            try:
                results.append(future.result())
                # increment the passes on the experiment
                experiment.passes += 1
                update_exp_value(experiment.expId, 'passes', experiment.passes)
            except Exception as e:
                explogger.error(f"Task failed with exception: {e}")
        
    with open('results.csv', 'a', encoding="utf8") as expResults:
        writer = csv.writer(expResults)
        # sort results by the first item in the array
        results.sort(key=lambda x: x[0])
        writer.writerows(results)
        
    explogger.info("Finished running Trials")


def _handle_trial_error(experiment: ExperimentData, numOutputs: int, paramNames: "list", writer, trialNum: int, err: BaseException):
    csvErrorValue = None
    if isinstance(err, TrialTimeoutError):
        csvErrorValue = "TIMEOUT"
        explogger.error(f"Trial#{trialNum} timed out")
    else:
        csvErrorValue = "ERROR"
        explogger.error(f'Trial#{trialNum} Encountered an Error')
    explogger.exception(err)
    experiment.fails += 1
    # expRef.update({'fails': experiment.fails})
    update_exp_value(experiment.expId, 'fails', experiment.fails)
    if trialNum == 0:
        message = f"First trial of {experiment.expId} ran into an error while running, aborting the whole experiment. Read the traceback to find out what the actual cause of this problem is (it will not necessarily be at the top of the stack trace)."
        raise ExperimentAbort(message) from err
    else:
        writer.writerow([trialNum] + [csvErrorValue for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
