import csv
import shutil
from subprocess import Popen, PIPE
import time
import os

# from modules.data.trial import Trial
from modules.configs import get_configs_ordered
from modules.exceptions import ExperimentAbort, FileHandlingError
from modules.exceptions import InternalTrialFailedError
from modules.configs import get_config_paramNames

PIPE_OUTPUT_ERROR_MESSAGE = "ERROR"
OUTPUT_INDICATOR_USING_CSVS = "In ResCsvs"


def get_data(process: 'Popen[str]', trialRun: int):
    try:
        data = process.communicate()
        os.chdir('ResCsvs')
        with open(f"log{trialRun}.txt",'w', encoding='utf8') as f:
            f.write(data[0])
            if data[1]:
                f.write(data[1])
            f.close()
        os.chdir('..')
        print(data)
        if data[1]:
            print(f'errors returned from pipe is {data[1]}')
            return PIPE_OUTPUT_ERROR_MESSAGE
    except Exception as e:
        print(e)
        raise InternalTrialFailedError("Encountered another exception while reading pipe") from e
    result = data[0].split('\n')[0]
    print(f"result data: {result}")
    return result


def run_trial(experiment_path, config_path, filetype, trialRun: int):
    #make sure that the cwd is ExperimentsFiles/{ExperimentId}
    if filetype == 'python':
        with Popen(['python', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            return get_data(process, trialRun)
    elif filetype == 'java':
        with Popen(['java', '-jar', experiment_path, config_path], stdout=PIPE, stdin=PIPE, stderr=PIPE, encoding='utf8') as process:
            return get_data(process, trialRun)


# def run_trial_v2(trial: Trial):
#     pass


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


def add_to_output_batch(fileOutput, ExpRun):
    try:
        shutil.copy2(f'{fileOutput}', f'ResCsvs/Result{ExpRun}.csv')
    except Exception as err:
        raise FileHandlingError("Failed to copy results csv") from err


def conduct_experiment(expId, expRef, experimentOutput, resultOutput, filepath, filetype, numTrialsToRun):
    print(f"Running Experiment {expId}")

    passes = 0
    fails = 0
    with open('results.csv', 'w', encoding="utf8") as expResults:
        paramNames = get_config_paramNames('configFiles/0.ini')
        writer = csv.writer(expResults)

        #Timing the first trial
        startSeconds = time.time()
        expRef.update({"startedAtEpochMillis": int(startSeconds * 1000)})
        try:
            firstTrial = run_trial(filepath, f'configFiles/{0}.ini', filetype, 0)
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
                    response_data = run_trial(filepath, f'configFiles/{i}.ini', filetype, i)
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
