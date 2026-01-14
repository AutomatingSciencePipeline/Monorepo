import os
import shutil
import logging
import json
import time
from bson.binary import Binary

from modules.data.types import DocumentId, IncomingStartRequest
from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import Parameter, parseRawHyperparameterData
#from modules.db.mongo import upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection
from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, close_experiment_logger, configure_root_logger, open_experiment_logger
from modules.runner import conduct_experiment
from modules.exceptions import GladosInternalError, ExperimentAbort, GladosUserError
from modules.output.plots import generateScatterPlot
from modules.configs import generate_config_files
from modules.utils import _get_env, upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection, get_experiment_with_id, update_exp_value, determine_experiment_file_type
import modules.mailSend

from modules.lifecycle import close_experiment_run

# set up logger
configure_root_logger()
explogger = logging.getLogger(EXPERIMENT_LOGGER)

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

def parse_experiment_metadata(raw_data):
    try:
        raw_data = process_exp_metadata(raw_data, raw_data['expId'])
        experiment = ExperimentData(**raw_data)
        experiment.postProcess = experiment.scatter #bruh moment
        experiment.experimentType = determine_experiment_file_type(experiment.file)
        return experiment
        
    except ValueError as err:
        explogger.error("Experiment data was not formatted correctly, aborting")
        raise GladosInternalError from err

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
    
def start_experiment(experiment):
    try:
        conduct_experiment(experiment)
        post_process_experiment(experiment)
        upload_experiment_results(experiment)
        send_email(experiment, "COMPLETED")
    except ExperimentAbort as err:
        explogger.error(f'Experiment {experiment.expId} critical failure, not doing any result uploading or post processing')
        explogger.exception(err)
        send_email(experiment, "ABORTED")
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error('Uncaught exception while running an experiment. The GLADOS code needs to be changed to handle this in a cleaner manner')
        explogger.exception(err)
        send_email(experiment, "FAILED")
    finally:
        raise GladosInternalError("Experiment run failed")

def generate_configs(experiment):
    totalExperimentRuns = generate_config_files(experiment)
    if totalExperimentRuns == 0:
        raise GladosInternalError("Error generating configs - somehow no config files were produced?")
    
    return totalExperimentRuns
      
def main():
    """Function that gets called when the file is ran"""
    with open("/data/exp_metadata.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        exp_id = data['expId']    
        
        try:
            os.chdir(f'/data/ExperimentFiles/{exp_id}')
            experiment = parse_experiment_metadata(data)
            
            # generate configs
            experiment.totalExperimentRuns = generate_configs(experiment)
            update_exp_value(exp_id, "totalExperimentRuns", experiment.totalExperimentRuns)
           
            start_experiment(experiment=experiment)
            
            explogger.info("Run finished, transferring control to data_handler")
   
        except Exception as err:
            explogger.exception(err)
        finally:
            os.chdir('../../..')
            close_experiment_run(exp_id, explogger)
            os.mkdir("/signals/start-cleanup") # signal datahandler to cleanup
            
if __name__ == '__main__':
    while not os.path.exists('/signals/done-setup'):
        time.sleep(1)
    
    main()
    