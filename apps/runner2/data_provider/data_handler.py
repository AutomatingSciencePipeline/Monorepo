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
from modules.utils import _get_env, upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection, get_experiment_with_id, update_exp_value, determine_experiment_file_type
import modules.mailSend
from modules.lifecycle import close_experiment_run

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    logging.error("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

# set up logger
configure_root_logger()
explogger = logging.getLogger(EXPERIMENT_LOGGER)

# ============= Runner Steps ================
def process_exp_metadata(exp_metadata, exp_id):
    # Parse hyperaparameters into their datatype. Required to parse the rest of the experiment data
    try:
        hyperparameters: "dict[str,Parameter]" = parseRawHyperparameterData(exp_metadata['hyperparameters'])
    except (KeyError, ValueError) as err:
        if isinstance(err, KeyError):
            explogger.error("Error generating hyperparameters - hyperparameters not found in experiment object, aborting")
        else:
            explogger.error("Error generating hyperparameters - Validation error")
        explogger.exception(err)
        close_experiment_run(exp_id, explogger)
        return
    exp_metadata['hyperparameters'] = hyperparameters
    
    return exp_metadata
    
def request_exp_metadata(exp_id):
    exp_metadata = get_experiment_with_id(exp_id)
    return exp_metadata

def download_experiment_files(exp_metadata):
    if exp_metadata['trialExtraFile'] != '' or exp_metadata['scatter']:
        explogger.info('There will be experiment outputs')
        os.makedirs('ResCsvs')
    
    filepath = exp_metadata['file']
    expId = exp_metadata['expId']
    explogger.info(f'Downloading file for {expId}')
    
    explogger.info(f"Downloading {filepath} to /data/ExperimentFiles/{expId}/{filepath}")
    try:
        # try to call the backend to download
        url = f'http://glados-service-backend:{os.getenv("BACKEND_PORT")}/downloadExpFile?fileId={filepath}'
        response = requests.get(url, timeout=60)
        file_contents = response.content
        # write the file contents to file path
        with open(filepath, "xb") as file:
            file.write(file_contents)
        
    except Exception as err:
        explogger.error(f"Error {err} occurred while trying to download experiment file")
        raise GladosInternalError('Failed to download experiment files') from err
    explogger.info(f"Downloaded {filepath} to /data/ExperimentFiles/{expId}/{filepath}")
    return filepath

def setup_data(metadata, exp_id):
    #Downloading Experiment File
    # If the program errors here after you just deleted the ExperimentFiles on your dev machine, restart the docker container, seems to be volume mount weirdness
    os.makedirs(f'/data/ExperimentFiles/{exp_id}')
    os.chdir(f'/data/ExperimentFiles/{exp_id}')
    filepath = download_experiment_files(exp_metadata=metadata)
    fileWasZip = False
    
    try:
        error_message = "This is not a supported experiment file type, aborting"
        experimentType = determine_experiment_file_type(filepath, explogger=explogger)
        write_exp_metadata_to_file(exp_metadata=metadata)
        
        
        if experimentType == ExperimentType.ZIP:
            error_message = "Failed to extract zip file"
            
            # rename the file to a zip file
            os.rename(filepath, "userProvidedFile.zip")
            shutil.unpack_archive("userProvidedFile.zip", '.')
        
        role = metadata['creatorRole']
        if role == "admin" or role == "privileged":
            explogger.info("User is admin or privileged, installing packages from packages.txt")
            install_additional_packages()
            
            explogger.info("User is admin or privileged, running commands from commandsToRun.txt") 
            run_custom_command()
        
        # this needs to happen after all dependencies are installed
        if experimentType == ExperimentType.ZIP:
            error_message = "This is not a supported experiment file type, aborting"
            
            # Recalc the file type
            fileWasZip = True
            
            # also update experiment.file
            exe_file = metadata['experimentExecutable']
            experimentType = determine_experiment_file_type(exe_file, explogger)
            metadata['file'] = exe_file
            explogger.info(f"New experiment file type: {exe_file}")
        
        # If it is a python file get the pipreqs
        if experimentType == ExperimentType.PYTHON:
            get_pip_reqs(fileWasZip=fileWasZip, exp_id=exp_id)
        
        # check if the new requirements exists
        if os.path.exists("userProvidedFileReqs.txt"):
            error_message = f"Failed to install pip requirements: {str(os.listdir())}"
            
            # do pip install -r userProvidedFileReqs.txt
            os.system(f"pip install -r userProvidedFileReqs.txt")

        write_exp_metadata_to_file(exp_metadata=metadata) # write before json become unserializable
        
        # generate configs
        # metadata = process_exp_metadata(metadata, exp_id)
        # experiment = ExperimentData(**metadata)
        # metadata['totalExperimentRuns'] = generate_configs(experiment)
        # update_exp_value(exp_id, "totalExperimentRuns", metadata['totalExperimentRuns'])
        
        
        

    except Exception as err:
        explogger.error(error_message)
        explogger.exception(err)
        os.chdir('../../..')
        
        raise err # propagate error
        

# def determine_experiment_file_type(filepath: str):
#     try:
#         rawfiletype = magic.from_file(filepath)
#         filetype = ExperimentType.UNKNOWN
#         if 'Python script' in rawfiletype or 'python3' in rawfiletype:
#             filetype = ExperimentType.PYTHON
#         elif 'Java archive data (JAR)' in rawfiletype:
#             filetype = ExperimentType.JAVA
#         elif 'ELF 64-bit LSB' in rawfiletype:
#             filetype = ExperimentType.C
#         # check if file is zip
#         elif 'Zip archive data' in rawfiletype:
#             filetype = ExperimentType.ZIP

#         explogger.info(f"Raw Filetype: {rawfiletype}, Filtered Filetype: {filetype.value}")

#         if filetype == ExperimentType.UNKNOWN:
#             explogger.error(f'File type "{rawfiletype}" could not be mapped to Python, Java or C, if it should consider updating the matching statements')
#             raise NotImplementedError("Unknown experiment file type")
#         return filetype
#     except Exception as err:
#         explogger.error('Error determining file type')
#         explogger.exception(err)
#         raise NotImplementedError("Unknown experiment file type") from err

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

def install_additional_packages():
    explogger.info("User is admin or privileged, installing packages from packages.txt")
    
    try:
        if os.path.exists("packages.txt"):
            install_packages("packages.txt")
    except Exception as e:
        raise GladosUserError('Failed to install packages') from e

def run_custom_command():
    try:
        if os.path.exists("commandsToRun.txt"):
            for line in open("commandsToRun.txt"):
                os.system(line)   
    except Exception as e:
        raise GladosUserError('Failed to run command') from e
    
def get_pip_reqs(fileWasZip, exp_id):
    # if the file exists, skip running the command
    try:
        if not os.path.exists("userProvidedFileReqs.txt"):
            if fileWasZip:
                os.system(f"pipreqs --savepath userProvidedFileReqs.txt .")
            else:
                os.system(f"pipreqs --savepath userProvidedFileReqs.txt ExperimentFiles/{exp_id}")
            explogger.info("Generated pip requirements")
    except Exception as e:
        raise GladosInternalError("Failed to generate pip requirements") from e

def generate_configs(experiment):
    totalExperimentRuns = generate_config_files(experiment)
    if totalExperimentRuns == 0:
        raise GladosInternalError("Error generating configs - somehow no config files were produced?")
    
    return totalExperimentRuns

def write_exp_metadata_to_file(exp_metadata):
    explogger.debug("write metadata to file")
    with open("/data/exp_metadata.json", "w") as file:
        json.dump(exp_metadata, file)
        
    explogger.debug("write to file finished")


# ============= Runner Steps End ================
explogger.info("GLADOS Runner Started")
def run_batch(data: IncomingStartRequest):
    explogger.debug(f"Incoming start request: {data}")
    
    # Obtain most basic experiment info
    exp_id = data['experiment']['id']
    update_exp_value(exp_id, "status", "RUNNING")
    open_experiment_logger(exp_id)
    
    try:
        metadata = request_exp_metadata(exp_id=exp_id)
        setup_data(metadata, exp_id)
        
        explogger.info("Setup finished, transferring control to runner")
        os.mkdir("/signals/done-setup") #signal runner that data is ready
        
        while not os.path.exists('/signals/start-cleanup'):
            time.sleep(1)
            
        
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.exception(err)
        close_experiment_run(exp_id, explogger)
        return      

def run_batch_and_catch_exceptions(data: IncomingStartRequest):
    try:
        run_batch(data)
    except Exception as err:
        explogger.error("Unexpected exception while trying to run the experiment, this was not caught by our own code and needs to be handled better.")
        explogger.exception(err)
        close_experiment_logger()
        # Unsafe to upload experiment logs files here
        raise err

def _check_request_integrity(data: typing.Any):
    print(data)
    try:
        json_data = json.loads(data)
        if json_data['experiment']['id'] is not None:
            return json_data
        return False
    except:
        return False

def main(experiment_data: str):
    """Function that gets called when the file is ran"""

    if json_data := _check_request_integrity(experiment_data):
        run_batch_and_catch_exceptions(json_data)
        return
    
    explogger.error("Received malformed experiment request: %s", experiment_data)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ValueError("Error: Too few arguments. Needs ID (ex: python runner.py 1234)")
    elif len(sys.argv) > 2:
        raise ValueError("Error: Too many arguments. Needs ID (ex: python runner.py 1234)")
    main(sys.argv[1])