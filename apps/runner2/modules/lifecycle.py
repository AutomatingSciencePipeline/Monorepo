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
from modules.logging.gladosLogging import close_experiment_logger
from modules.utils import update_exp_value, upload_experiment_log
# lifecyle
def remove_downloaded_directory(experimentId: DocumentId, explogger):
    folder_name = experimentId
    target_directory = "ExperimentFiles"
    folder_path = f'{target_directory}/{ folder_name}'
    explogger.info("this is the path " + folder_path)
    explogger.info("Does the path exist? " + str(os.path.exists(folder_path)))
    
    try:
        shutil.rmtree(folder_path)
        explogger.info("The folder directory " + folder_path + " successfully deleted.")
    except FileNotFoundError as err:
        explogger.error('Error during plot generation')
        explogger.exception(err)

def close_experiment_run(expId: DocumentId, explogger):
    explogger.info(f'Exiting experiment {expId}')
    update_exp_value(expId, 'finished', True)
    update_exp_value(expId, 'status', "COMPLETED")
    endSeconds = time.time()
    update_exp_value(expId, 'finishedAtEpochMilliseconds', int(endSeconds * 1000))
    close_experiment_logger()
    upload_experiment_log(expId)
    remove_downloaded_directory(expId, explogger)

# End lifecycle