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
from modules.db.mongo import update_mongo_data

PROCESS_OUT_STREAM = 0
PROCESS_ERROR_STREAM = 1

explogger = get_experiment_logger()


def _get_data(process: 'Popen[str]', trialRun: int, keepLogs: bool, trialTimeout: int):
    # If they are not going for file / , exclude everything else than the made file to get the name
    # Files to exclude: configFiles, experiment{expId}, ResCsvs, results.csv
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
    elif experiment.experimentType == ExperimentType.C:
        Popen(['chmod', '+x', experiment.file], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8')
        with Popen(['./' + experiment.file, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            _get_data(process, trialRun, experiment.keepLogs, experiment.timeout)


def _get_line_n_of_trial_results_csv(targetLineNumber: int, filename: str):
    try:
        with open(filename, mode='r', encoding="utf8") as file:
            reader = csv.reader(file)
            lineNum = 0
            lineBox = []
            if targetLineNumber == 0:
                line = None
                lineCounter = 0
                for item in reader:
                    if lineNum == targetLineNumber:
                        lineBox.append(item)
                    lineCounter += 1
                return (lineBox[0], lineCounter)
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


def _add_to_output_batch(trialExtraFile, ExpRun: int):
    try:
        # Currently only extra CSV files are supported, this will need to be adapted for other file types
        fileName = None
        if '/' in trialExtraFile:
            fileName = trialExtraFile.split('/')[-1]
        else:
            fileName = trialExtraFile
        
        destination_dir = f'ResCsvs/Result{ExpRun}/'
        destination_file = f'{destination_dir}{fileName}.csv'
       
        # Ensure the directory exists
        if not os.path.exists(destination_dir):
            os.makedirs(destination_dir)
       
        shutil.copy2(trialExtraFile, destination_file)
        
        # Move log file to the same directory
        if os.path.exists(f'ResCsvs/log{ExpRun}.txt'):
            shutil.move(f'ResCsvs/log{ExpRun}.txt', destination_dir)
            
    except Exception as err:
        explogger.error(f"Expected to find trial extra file at {trialExtraFile}")
        raise FileHandlingError("Failed to copy results csv. Maybe there was a typo in the filepath?") from err

def conduct_experiment_mongo(experiment: ExperimentData, expId):
    os.mkdir('configFiles')
    explogger.info(f"Running Experiment {experiment.expId}")
    
    numOutputs = 0
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = []
        writer = csv.writer(expResults)
        explogger.info(f"Now Running {experiment.totalExperimentRuns} trials")
        
        totalLineNumber = 0
        for trialNum in range(0, experiment.totalExperimentRuns):
            startSeconds = time.time()
            if trialNum == 0:
                update_mongo_data(expId, "startedAtEpochMillis", int(startSeconds * 1000))
                # expRef.update({"startedAtEpochMillis": int(startSeconds * 1000)})
                
            try:
                configFileName = create_config_from_data(experiment, trialNum)
                paramNames = get_config_paramNames('configFiles/0.ini')
            
            except Exception as err:
                raise GladosInternalError(f"Failed to generate config {trialNum} file") from err

            try:
                _run_trial(experiment, f'configFiles/{configFileName}', trialNum)
            except (TrialTimeoutError, InternalTrialFailedError) as err:
                _handle_trial_error_mongo(experiment, expId, numOutputs, paramNames, writer, trialNum, err)
                # _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                continue

            endSeconds = time.time()
            timeTakenMinutes = (endSeconds - startSeconds) / 60

            if trialNum == 0:
                estimatedTotalTimeMinutes = timeTakenMinutes * experiment.totalExperimentRuns
                explogger.info(f"Estimated minutes to run: {estimatedTotalTimeMinutes}")
                update_mongo_data(expId, 'estimatedTotalTimeMinutes', estimatedTotalTimeMinutes)
                # expRef.update({'estimatedTotalTimeMinutes': estimatedTotalTimeMinutes})

                # Get the header of the csv file for result
                try:
                    headerAndTrials = _get_line_n_of_trial_results_csv(0, experiment.trialResult)
                    csvHeader = headerAndTrials[0]
                    totalLineNumber = headerAndTrials[1]
                except GladosUserError as err:
                    _handle_trial_error_mongo(experiment, expId, numOutputs, paramNames, writer, trialNum, err)
                    # _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                    return
                numOutputs = len(csvHeader)
                writer.writerow(["Experiment Run"] + csvHeader + paramNames)

            if experiment.has_extra_files():
                try:
                    # Check if we have comma
                    # for loop for each extra file
                    if '*' in experiment.trialExtraFile:
                        extra_without_star = experiment.trialExtraFile.replace('*', '')
                        directory_path = f'{extra_without_star}'
                        
                        extraFiles = os.listdir(directory_path)
                
                        for extraFile in extraFiles:
                            new_dir = f'{extra_without_star}/{extraFile}'
                            _add_to_output_batch(new_dir, trialNum)
                    elif experiment.trialExtraFile is not None and ("," in experiment.trialExtraFile):
                        if (", " in experiment.trialExtraFile):
                            extraFiles = experiment.trialExtraFile.split(", ")
                        elif ("," in experiment.trialExtraFile):
                            extraFiles = experiment.trialExtraFile.split(",")
                        
                        for extraFile in extraFiles:
                            _add_to_output_batch(extraFile, trialNum)
                    else:
                        _add_to_output_batch(experiment.trialExtraFile, trialNum)
                except FileHandlingError as err:
                    _handle_trial_error_mongo(experiment, expId, numOutputs, paramNames, writer, trialNum, err)
                    # _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                    continue

            # Generates giant result file
            try:
                for i in range(1, totalLineNumber):
                    output = _get_line_n_of_trial_results_csv(i, experiment.trialResult)
                    writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
            except GladosUserError as err:
                _handle_trial_error_mongo(experiment, expId, numOutputs, paramNames, writer, trialNum, err)
                # _handle_trial_error(experiment, expRef, numOutputs, paramNames, writer, trialNum, err)
                continue
            # writer.writerow([trialNum] + output + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))
            
            if experiment.has_extra_files():
                # Zip the folders that are inside the output folder
                shutil.make_archive(f'ResCsvs/Result{trialNum}', 'zip', f'ResCsvs/Result{trialNum}')
                # Delete the non-zipped folder
                shutil.rmtree(f'ResCsvs/Result{trialNum}')
            explogger.info(f'Trial#{trialNum} completed')
            experiment.passes += 1
            update_mongo_data(expId, 'passes', experiment.passes)
            # expRef.update({'passes': experiment.passes})
        explogger.info("Finished running Trials")

def _handle_trial_error_mongo(experiment: ExperimentData, expId, numOutputs: int, paramNames: "list", writer, trialNum: int, err: BaseException):
    csvErrorValue = None
    if isinstance(err, TrialTimeoutError):
        csvErrorValue = "TIMEOUT"
        explogger.error(f"Trial#{trialNum} timed out")
    else:
        csvErrorValue = "ERROR"
        explogger.error(f'Trial#{trialNum} Encountered an Error')
    explogger.exception(err)
    experiment.fails += 1
    update_mongo_data(expId, 'fails', experiment.fails)
    if trialNum == 0:
        message = f"First trial of {experiment.expId} ran into an error while running, aborting the whole experiment. Read the traceback to find out what the actual cause of this problem is (it will not necessarily be at the top of the stack trace)."
        raise ExperimentAbort(message) from err
    else:
        writer.writerow([trialNum] + [csvErrorValue for i in range(numOutputs)] + get_configs_ordered(f'configFiles/{trialNum}.ini', paramNames))