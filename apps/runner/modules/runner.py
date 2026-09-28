import csv
import shutil
from subprocess import Popen, PIPE, TimeoutExpired
import time
import os

# from modules.data.trial import Trial
from modules.configs import create_config_from_data, create_yaml_from_data, get_configs_ordered_ini, get_configs_ordered_yaml
from modules.data.experiment import ExperimentData, ExperimentType
from modules.exceptions import FileHandlingError, GladosInternalError, GladosUserError, TrialTimeoutError
from modules.exceptions import InternalTrialFailedError
from modules.configs import get_config_paramNames_ini, get_config_paramNames_yaml
from modules.logging.gladosLogging import get_experiment_logger
from modules.utils import update_exp_value

from concurrent.futures import ProcessPoolExecutor, as_completed

PROCESS_OUT_STREAM = 0
PROCESS_ERROR_STREAM = 1

explogger = get_experiment_logger()


def _get_data(process: 'Popen[str]', trialRun: int, trialTimeout: int):
    try:
        data = process.communicate(timeout=trialTimeout)
        os.chdir('../ResCsvs')
        with open(f"log{trialRun}.txt", 'w', encoding='utf8') as trialLogFile:
            trialLogFile.write(data[PROCESS_OUT_STREAM])
            if data[1]:
                trialLogFile.write(data[PROCESS_ERROR_STREAM])
            trialLogFile.close()
        os.chdir('..')
        if data[PROCESS_ERROR_STREAM]:
            # pybullet build time is a common error that is not an error
            # the pybullet developers made this output on stderr because they are horrible developers
            # just ignore it for now, try to find a fix for this later
            if "pybullet build time" in data[PROCESS_ERROR_STREAM]:
                return
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
            _get_data(process, trialRun, experiment.timeout)
    elif experiment.experimentType == ExperimentType.JAVA:
        with Popen(['java', '-jar', "../" + experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.timeout)
    elif experiment.experimentType == ExperimentType.C:
        Popen(['chmod', '+x', "../" + experiment.file], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8')
        with Popen(['../' + experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.timeout)


def _get_line_n_of_trial_results_csv(targetLineNumber: int, filename: str):
    try:
        with open(filename, mode='r', encoding="utf8") as file:
            reader = csv.reader(file)
            lineNum = 0
            currLine = None
            for line in reader:
                currLine = line
                if lineNum == targetLineNumber:
                    return line
                lineNum += 1
            
            if targetLineNumber == -1:
                return currLine        
                    
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
   
    
def _get_param_names(experiment: ExperimentData):
    if(experiment.configFileFormat == "yaml"):
        return get_config_paramNames_yaml('configFiles/0.yaml')
    return get_config_paramNames_ini('configFiles/0.ini')


def _get_ordered_configs(experiment: ExperimentData, trialNum: int, paramNames: "list"):
    if(experiment.configFileFormat == "yaml"):
        return get_configs_ordered_yaml(f'configFiles/{trialNum}.yaml', paramNames)
    return get_configs_ordered_ini(f'configFiles/{trialNum}.ini', paramNames)


def _failed_outcome(trialNum: int, err: BaseException, configs: "list"):
    return {
        "trialNum": trialNum,
        "ok": False,
        "output": None,
        "configs": configs,
        "errorValue": "TIMEOUT" if isinstance(err, TrialTimeoutError) else "ERROR",
        "error": _describe_error(err),
    }


def _run_trial_wrapper(experiment: ExperimentData, trialNum: int):
    """
    Runs a single trial in a worker process and returns its outcome instead of raising or touching the database,
    so that the parent process is the single source of truth for pass/fail counts.
    """
    explogger.info(f"Running Trial {trialNum}")
    configs = []

    try:
        try:
            if(experiment.configFileFormat == "yaml"):
                configFileName = create_yaml_from_data(experiment, trialNum)
            else:
                configFileName = create_config_from_data(experiment, trialNum)
            configs = _get_ordered_configs(experiment, trialNum, _get_param_names(experiment))
        except Exception as err:
            raise GladosInternalError(f"Failed to generate config {trialNum} file") from err

        _run_trial(experiment, f'../configFiles/{configFileName}', trialNum)

        if experiment.has_extra_files() and experiment.trialExtraFile != None:
            _add_to_output_batch(f"trial{trialNum}/" + experiment.trialExtraFile, trialNum)

        output = _get_line_n_of_trial_results_csv(experiment.trialResultLineNumber, f"trial{trialNum}/" + experiment.trialResult)
    except Exception as err:  # pylint: disable=broad-exception-caught
        _log_trial_error(trialNum, err)
        return _failed_outcome(trialNum, err, configs)

    return {"trialNum": trialNum, "ok": True, "output": output, "configs": configs, "errorValue": None, "error": None}


def conduct_experiment(experiment: ExperimentData):
    """
    Call this function when inside the experiment folder!
    Runs every trial, writes results.csv, and sets experiment.passes, experiment.fails and experiment.status
    ("COMPLETED" if at least one trial succeeded, "FAILED" otherwise) from the trial outcomes.
    """
    os.mkdir('configFiles')
    explogger.info(f"Running Experiment {experiment.expId}")
    explogger.info(f"Now Running {experiment.totalExperimentRuns} trials")

    trialNums = range(0, experiment.totalExperimentRuns)
    outcomes = []
    experiment.passes = 0
    experiment.fails = 0

    # mark the experiment as started
    update_exp_value(experiment.expId, "startedAtEpochMillis", int(time.time() * 1000))
    with ProcessPoolExecutor() as executor:
        futures = {executor.submit(_run_trial_wrapper, experiment, trialNum): trialNum for trialNum in trialNums}
        for future in as_completed(futures):
            try:
                outcome = future.result()
            except Exception as err:  # pylint: disable=broad-exception-caught
                # The worker process itself failed, count it as a failed trial
                _log_trial_error(futures[future], err)
                outcome = _failed_outcome(futures[future], err, [])
            outcomes.append(outcome)
            # Counts are aggregated here in the parent; each worker process only has its own copy of the experiment
            if outcome["ok"]:
                experiment.passes += 1
                update_exp_value(experiment.expId, 'passes', experiment.passes)
            else:
                experiment.fails += 1
                update_exp_value(experiment.expId, 'fails', experiment.fails)

    outcomes.sort(key=lambda o: o["trialNum"])
    _write_results_csv(experiment, outcomes)

    explogger.info(f"Finished running Trials: {experiment.passes} succeeded, {experiment.fails} failed")
    experiment.status = "COMPLETED" if experiment.passes > 0 else "FAILED"


def _write_results_csv(experiment: ExperimentData, outcomes: "list"):
    firstSuccess = next((o for o in outcomes if o["ok"]), None)
    if firstSuccess is None:
        explogger.error("Every trial failed, not producing results.csv")
        return

    paramNames = _get_param_names(experiment)
    csvHeader = _get_line_n_of_trial_results_csv(0, f"trial{firstSuccess['trialNum']}/" + experiment.trialResult)
    numOutputs = len(csvHeader)
    with open('results.csv', 'w', encoding="utf8") as expResults:
        writer = csv.writer(expResults)
        writer.writerow(["Experiment Run"] + csvHeader + paramNames)
        for outcome in outcomes:
            if outcome["ok"]:
                writer.writerow([outcome["trialNum"]] + outcome["output"] + outcome["configs"])
            else:
                writer.writerow([outcome["trialNum"]] + [outcome["errorValue"] for i in range(numOutputs)] + outcome["configs"])


def _log_trial_error(trialNum: int, err: BaseException):
    if isinstance(err, TrialTimeoutError):
        explogger.error(f"Trial#{trialNum} timed out")
    else:
        explogger.error(f'Trial#{trialNum} Encountered an Error: {_describe_error(err)}')
    explogger.exception(err)


def _describe_error(err: BaseException):
    """Include the underlying cause (e.g. the FileNotFoundError for a missing output file) alongside the GLADOS message"""
    message = str(err)
    if err.__cause__ is not None:
        message += f" (caused by {type(err.__cause__).__name__}: {err.__cause__})"
    return message
