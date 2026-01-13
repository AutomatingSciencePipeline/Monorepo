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

def _check_request_integrity(data: typing.Any):
    print(data)
    try:
        json_data = json.loads(data)
        if json_data['experiment']['id'] is not None:
            return json_data
        return False
    except:
        return False
    
def run_batch(data: IncomingStartRequest):
    # Obtain most basic experiment info
    exp_id = data['experiment']['id']
    explogger.debug('received %s', exp_id)
    update_exp_value(exp_id, "status", "RUNNING")

    open_experiment_logger(exp_id)
    
    explogger.debug(f"[DEBUG] Incoming start request: {data}")
    
    explogger.debug(f"found in data: {os.listdir("./data")}")
    
    with("./data/my_data.txt", "r") as file:
        content = file.read()
        explogger.debug(f"file content: {content}")
        
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

def main(experiment_data: str):
    """Function that gets called when the file is ran"""

    if json_data := _check_request_integrity(experiment_data):
        run_batch_and_catch_exceptions(json_data)
        return
    
    syslogger.error("Received malformed experiment request: %s", experiment_data)
    
    
def close_experiment_run(expId: DocumentId):
    explogger.info(f'Exiting experiment {expId}')
    update_exp_value(expId, 'finished', True)
    update_exp_value(expId, 'status', "COMPLETED")
    endSeconds = time.time()
    update_exp_value(expId, 'finishedAtEpochMilliseconds', int(endSeconds * 1000))
    close_experiment_logger()
    upload_experiment_log(expId)


if __name__ == '__main__':
    
    while not os.path.exists('/signals/ready'):
        time.sleep(1)
    
    if len(sys.argv) < 2:
        raise ValueError("Error: Too few arguments. Needs ID (ex: python runner.py 1234)")
    elif len(sys.argv) > 2:
        raise ValueError("Error: Too many arguments. Needs ID (ex: python runner.py 1234)")
    main(sys.argv[1])
