from modules.logging.gladosLogging import EXPERIMENT_LOGGER, SYSTEM_LOGGER, close_experiment_logger, configure_root_logger, open_experiment_logger
import typing, sys, logging, json, time, shutil, os
from modules.data.types import DocumentId, IncomingStartRequest
from modules.utils import _get_env, upload_experiment_aggregated_results, upload_experiment_log, upload_experiment_zip, verify_mongo_connection, get_experiment_with_id, update_exp_value

try:
    import magic  # Crashes on windows if you're missing the 'python-magic-bin' python package
except ImportError:
    logging.error("Failed to import the 'magic' package, you're probably missing a system level dependency")
    sys.exit(1)

# set up logger
configure_root_logger()
syslogger = logging.getLogger(SYSTEM_LOGGER)
explogger = logging.getLogger(EXPERIMENT_LOGGER)

# lifecyle
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

# TODO: Need to Perform cleanup and teardown in sequence
def close_experiment_run(expId: DocumentId):
    explogger.info(f'Exiting experiment {expId}')
    update_exp_value(expId, 'finished', True)
    update_exp_value(expId, 'status', "COMPLETED")
    endSeconds = time.time()
    update_exp_value(expId, 'finishedAtEpochMilliseconds', int(endSeconds * 1000))
    close_experiment_logger()
    upload_experiment_log(expId)
    remove_downloaded_directory(expId)

# End lifecycle

explogger.info("GLADOS Runner Started")
def run_batch(data: IncomingStartRequest):
    # Obtain most basic experiment info
    exp_id = data['experiment']['id']
    explogger.debug('received %s', exp_id)
    update_exp_value(exp_id, "status", "RUNNING")

    open_experiment_logger(exp_id)
    
    explogger.debug(f"[DEBUG] Incoming start request: {data}")
    
    
    try:
        experiment_data = get_experiment_with_id(exp_id)
        explogger.debug(f"experiment data retrieved:\n[START DATA]\n{experiment_data}\n[END]")
        explogger.debug("write to file")
        
        with open("/data/my_data.txt", "w+") as file:
            file.write(str(experiment_data))
            file.write("\n\n\n Hello from data_handler\n")

        explogger.debug("write to file finished")
        open('/signals/ready', 'w').close() # for signal
    
    except Exception as err:  # pylint: disable=broad-exception-caught
        explogger.error("Error retrieving experiment data from mongo, aborting")
        explogger.exception(err)
        close_experiment_run(exp_id)
        return
    
        
    explogger.info(f"[END] End of operation.")
    close_experiment_run(exp_id)

def run_batch_and_catch_exceptions(data: IncomingStartRequest):
    try:
        run_batch(data)
    except Exception as err:
        syslogger.error("Unexpected exception while trying to run the experiment, this was not caught by our own code and needs to be handled better.")
        syslogger.exception(err)
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
    
    syslogger.error("Received malformed experiment request: %s", experiment_data)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ValueError("Error: Too few arguments. Needs ID (ex: python runner.py 1234)")
    elif len(sys.argv) > 2:
        raise ValueError("Error: Too many arguments. Needs ID (ex: python runner.py 1234)")
    main(sys.argv[1])