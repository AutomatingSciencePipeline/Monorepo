"""Module that provides functionality of the runner"""
import os
import shutil
import logging
import subprocess
import sys
import json
import time
import typing

import requests
from bson.binary import Binary

from modules.data.types import DocumentId, IncomingStartRequest
from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import Parameter, parseRawHyperparameterData
#from modules.db.mongo import upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection
from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, close_experiment_logger, configure_root_logger, open_experiment_logger
from modules.runner import conduct_experiment
from modules.exceptions import CustomFlaskError, DatabaseConnectionError, GladosInternalError, ExperimentAbort, GladosUserError
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files
from modules.utils import _get_env, upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection, get_experiment_with_id, update_exp_value
import modules.mailSend

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    logging.error("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

DB_COLLECTION_EXPERIMENTS = "Experiments"

# set up logger
configure_root_logger()
syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)


syslogger.info("GLADOS Runner Started")

def main(experiment_data: str):
    """Function that gets called when the file is ran"""

    if _check_request_integrity(experiment_data):
        run_batch_and_catch_exceptions(json.loads(experiment_data))
        return
    
    syslogger.error("Received malformed experiment request: %s", experiment_data)

def _check_request_integrity(data: typing.Any):
    print(data)
    try:
        json_data = json.loads(data)
        return json_data['experiment']['id'] is not None
    except KeyError:
        return False
    
def run_batch_and_catch_exceptions(data: IncomingStartRequest):
    try:
        run_batch(data)
    except Exception as err:
        syslogger.error("Unexpected exception while trying to run the experiment, this was not caught by our own code and needs to be handled better.")
        syslogger.exception(err)
        close_experiment_logger()
        # Unsafe to upload experiment logs files here
        raise err

def install_packages(file_path):
    try:
        # Read the packages from the file
        with open(file_path, "r") as file:
            packages = file.read().splitlines()

        if not packages:
            explogger.info("No packages to install.")
            return

        # Update the package list
        explogger.info("Updating package list...")
        subprocess.run(["apt-get", "update"], check=True)

        # Install the packages
        explogger.info("Installing packages...")
        subprocess.run(["apt-get", "install", "-y"] + packages, check=True)
        
        # Update cache
        explogger.info("Updating cache...")
        subprocess.run(["ldconfig"], check=True)

        explogger.info("Packages installed successfully!")
    except subprocess.CalledProcessError as e:
        explogger.error(f"Error occurred while running a command: {e}")
    except FileNotFoundError:
        explogger.error(f"File '{file_path}' not found.")
    except Exception as e:
        explogger.error(f"An unexpected error occurred: {e}")


def run_batch(data: IncomingStartRequest):
    fileWasZip = False
    syslogger.info('Run_Batch starting with data %s', data)

    # Obtain most basic experiment info
    exp_id = data['experiment']['id']
    syslogger.debug('received %s', exp_id)
    update_exp_value(exp_id, "status", "RUNNING")

    open_experiment_logger(exp_id)

    # Retrieve experiment details from the backend api
    try:
        experiment_data = get_experiment_with_id(exp_id)
        
        
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error("Error retrieving experiment data from mongo, aborting")
        explogger.exception(err)
        close_experiment_run(exp_id)
        return

    # Parse hyperaparameters into their datatype. Required to parse the rest of the experiment data
    try:
        hyperparameters: "dict[str,Parameter]" = parseRawHyperparameterData(experiment_data['hyperparameters'])
    except (KeyError, ValueError) as err:
        if isinstance(err, KeyError):
            explogger.error("Error generating hyperparameters - hyperparameters not found in experiment object, aborting")
        else:
            explogger.error("Error generating hyperparameters - Validation error")
        explogger.exception(err)
        close_experiment_run(exp_id)
        return
    experiment_data['hyperparameters'] = hyperparameters

    # Parsing into Datatype
    try:
        experiment = ExperimentData(**experiment_data)
        experiment.postProcess = experiment.scatter
    except ValueError as err:
        explogger.error("Experiment data was not formatted correctly, aborting")
        explogger.exception(err)
        close_experiment_run(exp_id)
        return

    #Downloading Experiment File
    # If the program errors here after you just deleted the ExperimentFiles on your dev machine, restart the docker container, seems to be volume mount weirdness
    os.makedirs(f'ExperimentFiles/{exp_id}')
    os.chdir(f'ExperimentFiles/{exp_id}')
    filepath = download_experiment_files(experiment)

    try:
        experiment.experimentType = determine_experiment_file_type(filepath)
    except NotImplementedError as err:
        explogger.error("This is not a supported experiment file type, aborting")
        explogger.exception(err)
        os.chdir('../..')
        close_experiment_run(exp_id)
        return
    
    # If it is a zip file, extract it
    if experiment.experimentType == ExperimentType.ZIP:
        try:
            # rename the file to a zip file
            os.rename(filepath, "userProvidedFile.zip")
            shutil.unpack_archive("userProvidedFile.zip", '.')
        except Exception as err:
            explogger.error("Failed to extract zip file")
            explogger.exception(err)
            os.chdir('../..')
            close_experiment_run(exp_id)
            return
    
    # if experiment.creatorRole == "admin" or experiment.creatorRole == "privileged":
    if True:
        explogger.info("User is admin or privileged, installing packages from packages.txt")
        
        if os.path.exists("packages.txt"):
            try:
                install_packages("packages.txt")
            except Exception as err:
                explogger.error("Failed to install packages")
                explogger.exception(err)
                os.chdir('../..')
                close_experiment_run(exp_id)
        
        explogger.info("User is admin or privileged, running commands from commandsToRun.txt")
            
        if os.path.exists("commandsToRun.txt"):
            for line in open("commandsToRun.txt"):
                try:
                    os.system(line)
                except Exception as err:
                    explogger.error(f"Failed to run command: {line}")
                    explogger.exception(err)
                    os.chdir('../..')
                    close_experiment_run(exp_id)
                    return        
            
    # this needs to happen after all dependencies are installed
    if experiment.experimentType == ExperimentType.ZIP:
        # Recalc the file type
        try:
            fileWasZip = True
            experiment.experimentType = determine_experiment_file_type(experiment.experimentExecutable)
            # also update experiment.file
            experiment.file = experiment.experimentExecutable
            explogger.info(f"New experiment file type: {experiment.experimentType}")
        except NotImplementedError as err:
            explogger.error("This is not a supported experiment file type, aborting")
            explogger.exception(err)
            os.chdir('../..')
            close_experiment_run(exp_id)
            return
      
    # If it is a python file get the pipreqs
    if experiment.experimentType == ExperimentType.PYTHON:
        try:
            # if the file exists, skip running the command
            if not os.path.exists("userProvidedFileReqs.txt"):
                if fileWasZip:
                    os.system(f"pipreqs --savepath userProvidedFileReqs.txt .")
                else:
                    os.system(f"pipreqs --savepath userProvidedFileReqs.txt ExperimentFiles/{exp_id}")
                explogger.info("Generated pip requirements")
        except Exception as err:
            explogger.error("Failed to generate pip requirements")
            explogger.exception(err)
            os.chdir('../..')
            close_experiment_run(exp_id)
            return

    # check if the new requirements exists
    if os.path.exists("userProvidedFileReqs.txt"):
        # do pip install -r userProvidedFileReqs.txt
        try:
            os.system(f"pip install -r userProvidedFileReqs.txt")
        except Exception as err:
            explogger.error("Failed to install pip requirements")
            explogger.exception(err)
            os.chdir('../..')
            close_experiment_run(exp_id)
            return

    explogger.info(f"Generating configs and downloading to ExperimentFiles/{exp_id}/configFiles")

    totalExperimentRuns = generate_config_files(experiment)
    if totalExperimentRuns == 0:
        os.chdir('../..')
        explogger.exception(GladosInternalError("Error generating configs - somehow no config files were produced?"))
        close_experiment_run(exp_id)
        return

    experiment.totalExperimentRuns = totalExperimentRuns

    update_exp_value(exp_id, "totalExperimentRuns", experiment.totalExperimentRuns)

    try:
        conduct_experiment(experiment)
        post_process_experiment(experiment)
        upload_experiment_results(experiment)
        send_email(experiment, "COMPLETED")
    except ExperimentAbort as err:
        explogger.error(f'Experiment {exp_id} critical failure, not doing any result uploading or post processing')
        explogger.exception(err)
        send_email(experiment, "ABORTED")
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error('Uncaught exception while running an experiment. The GLADOS code needs to be changed to handle this in a cleaner manner')
        explogger.exception(err)
        send_email(experiment, "FAILED")
    finally:
        # We need to be out of the dir for the log file upload to work
        os.chdir('../..')
        close_experiment_run(exp_id)

def close_experiment_run(expId: DocumentId):
    explogger.info(f'Exiting experiment {expId}')
    update_exp_value(expId, 'finished', True)
    update_exp_value(expId, 'status', "COMPLETED")
    endSeconds = time.time()
    update_exp_value(expId, 'finishedAtEpochMilliseconds', int(endSeconds * 1000))
    close_experiment_logger()
    upload_experiment_log(expId)
    remove_downloaded_directory(expId)

def determine_experiment_file_type(filepath: str):
    try:
        rawfiletype = magic.from_file(filepath)
        filetype = ExperimentType.UNKNOWN
        if 'Python script' in rawfiletype or 'python3' in rawfiletype:
            filetype = ExperimentType.PYTHON
        elif 'Java archive data (JAR)' in rawfiletype:
            filetype = ExperimentType.JAVA
        elif 'ELF 64-bit LSB' in rawfiletype:
            filetype = ExperimentType.C
        # check if file is zip
        elif 'Zip archive data' in rawfiletype:
            filetype = ExperimentType.ZIP

        explogger.info(f"Raw Filetype: {rawfiletype}, Filtered Filetype: {filetype.value}")

        if filetype == ExperimentType.UNKNOWN:
            explogger.error(f'File type "{rawfiletype}" could not be mapped to Python, Java or C, if it should consider updating the matching statements')
            raise NotImplementedError("Unknown experiment file type")
        return filetype
    except Exception as err:
        explogger.error('Error determining file type')
        explogger.exception(err)
        raise NotImplementedError("Unknown experiment file type") from err

def download_experiment_files(experiment: ExperimentData):
    if experiment.has_extra_files() or experiment.postProcess != '' or experiment.keepLogs:
        explogger.info('There will be experiment outputs')
        os.makedirs('ResCsvs')
    explogger.info(f'Downloading file for {experiment.expId}')

    filepath = experiment.file
    explogger.info(f"Downloading {filepath} to ExperimentFiles/{experiment.expId}/{filepath}")
    try:
        # try to call the backend to download
        url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/downloadExpFile?fileId={experiment.file}'
        response = requests.get(url, timeout=60)
        file_contents = response.content
        # write the file contents to file path
        with open(filepath, "xb") as file:
            file.write(file_contents)
        
    except Exception as err:
        explogger.error(f"Error {err} occurred while trying to download experiment file")
        raise GladosInternalError('Failed to download experiment files') from err
    explogger.info(f"Downloaded {filepath} to ExperimentFiles/{experiment.expId}/{filepath}")
    return filepath

def remove_downloaded_directory(experimentId: DocumentId):
    
    folder_name = experimentId
    target_directory = "ExperimentFiles"
    folder_path = f'{target_directory}/{ folder_name}'
    explogger.info("this is the path " + folder_path)
    explogger.info("Does the path exist? " + str(os.path.exists(folder_path)))
    items = os.listdir(target_directory)
    
    try:
        shutil.rmtree(folder_path)
        explogger.info("The folder directory " + folder_path + " successfully deleted.")
    except FileNotFoundError as err:
        explogger.error('Error during plot generation')
        explogger.exception(err)

def upload_experiment_results(experiment: ExperimentData):
    explogger.info('Uploading Experiment Results...')

    explogger.info('Uploading to MongoDB')
    verify_mongo_connection()

    resultContent = None
    try:
        with open('results.csv', 'r', encoding="utf8") as experimentFile:
            resultContent = experimentFile.read()
    except Exception as err:
        raise GladosInternalError("Failed to read aggregated result file data for upload to mongodb") from err

    upload_experiment_aggregated_results(experiment, resultContent)

    if experiment.has_extra_files() or experiment.postProcess or experiment.keepLogs:
        explogger.info('Uploading Result Csvs')
        
        # Copy the configFiles to the ResCsvs folder
        try:
            # Check if configFiles dir exists
            if os.path.exists('configFiles'):
                shutil.copytree('configFiles', 'ResCsvs/configFiles')
        except Exception as err:
            raise GladosInternalError("Error copying config files to ResCsvs") from err

        encoded = None
        try:
            shutil.make_archive('ResultCsvs', 'zip', 'ResCsvs')
            with open("ResultCsvs.zip", "rb") as file:
                encoded = Binary(file.read())
        except Exception as err:
            raise GladosInternalError("Error preparing experiment results zip") from err

        upload_experiment_zip(experiment, encoded)

def post_process_experiment(experiment: ExperimentData):
    if experiment.postProcess:
        explogger.info("Beginning post processing")
        try:
            if experiment.scatter:
                explogger.info("Creating Scatter Plot")
                depVar = experiment.scatterDepVar
                indVar = experiment.scatterIndVar
                generateScatterPlot(indVar, depVar, 'results.csv', experiment.expId)
        except (KeyError, ValueError) as err:
            explogger.error('Error during plot generation')
            explogger.exception(err)
            
def send_email(experiment: ExperimentData, status: str):
    if experiment.sendEmail:
        explogger.info(f"Sending email to {experiment.creatorEmail}")
        experiment.status = status
        modules.mailSend.send_email(experiment)
    
        

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ValueError("Error: Too few arguments. Needs ID (ex: python runner.py 1234)")
    elif len(sys.argv) > 2:
        raise ValueError("Error: Too many arguments. Needs ID (ex: python runner.py 1234)")
    main(sys.argv[1])
