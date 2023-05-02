import datetime
import logging
from logging.handlers import RotatingFileHandler
import os

from modules.data.types import DocumentId

# Important information about loggers:
# + Calls of child loggers will be propgated to parent loggers.
#   So, logging to `glados.experiment` will also log to `glados`
# + They can be written to from multiple THREADS without issue, but not multiple PROCESSES
#   https://docs.python.org/3/library/logging.html#thread-safety
# + It's not a good idea to create a ton of loggers, because they are never GC'd.
#   That's why we use new handlers to separate log files, instead of creating a new logger for each experiment.
#   https://docs.python.org/3/howto/logging-cookbook.html#patterns-to-avoid
# + If a child logger's parent has handlers set up, the parent's handlers will be considered when calling hasHandlers, but not in logger.handlers

SYSTEM_LOGGER = 'glados'
EXPERIMENT_LOGGER = 'glados.experiment'

LOGGING_DIRECTORY = 'logs'


def _create_directories():
    # https://stackoverflow.com/questions/32133856/logger-cannot-find-file
    if not os.path.exists(LOGGING_DIRECTORY):
        os.makedirs(LOGGING_DIRECTORY)
    if not os.path.exists(f"{LOGGING_DIRECTORY}/experiment"):
        os.makedirs(f"{LOGGING_DIRECTORY}/experiment")


def get_system_logger():
    return logging.getLogger(SYSTEM_LOGGER)


def get_experiment_logger():
    return logging.getLogger(EXPERIMENT_LOGGER)


root_logger = get_system_logger()


def configure_root_logger():
    _create_directories()

    root_logger.setLevel(logging.DEBUG)

    bytes_to_megabytes = 1000000
    max_file_size = 10 * bytes_to_megabytes
    system_log_file = RotatingFileHandler(filename=f"{LOGGING_DIRECTORY}/system.DEBUG.log", encoding="utf-8", backupCount=10, maxBytes=max_file_size)
    system_log_file.setLevel(logging.DEBUG)
    system_log_file.setFormatter(_standard_file_formatter())
    root_logger.addHandler(system_log_file)

    console = logging.StreamHandler()
    console.setLevel(logging.DEBUG)
    console.setFormatter(_standard_stream_formatter())
    root_logger.addHandler(console)


def get_filepath_for_experiment_log(experimentId: DocumentId):
    return f"{LOGGING_DIRECTORY}/experiment/experiment_{experimentId}.log"


def open_experiment_logger(experimentId: DocumentId):
    root_logger.info('Opening experiment logger for experiment %s', experimentId)
    explogger = logging.getLogger(EXPERIMENT_LOGGER)

    if len(explogger.handlers) > 0:
        root_logger.error("Experiment logger already has a handler! This means the last one wasn't closed properly. Closing it now to avoid file pollution.")
        while len(explogger.handlers) > 0:
            item = explogger.handlers[0]
            root_logger.error("Closed a handler: %s", item)
            explogger.removeHandler(item)

    experiment_log_file = logging.FileHandler(filename=get_filepath_for_experiment_log(experimentId), encoding="utf-8")
    experiment_log_file.setLevel(logging.DEBUG)
    experiment_log_file.setFormatter(_standard_file_formatter())
    explogger.addHandler(experiment_log_file)


def close_experiment_logger():
    root_logger.info('Closing experiment logger file')

    explogger = logging.getLogger(EXPERIMENT_LOGGER)
    if len(explogger.handlers) == 0:
        root_logger.warning("Experiment logger has no handler! This means it was closed twice. Ignoring.")
        return
    handler = explogger.handlers[0]
    explogger.removeHandler(handler)
    handler.close()


def upload_experiment_log(experimentId: DocumentId):
    filePath = get_filepath_for_experiment_log(experimentId)
    get_system_logger().warning('TODO upload the file to the database: %s', filePath)


def _standard_file_formatter():
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    formatter.usesTime()
    formatter.formatTime = (  # https://stackoverflow.com/a/58777937
        lambda record, datefmt=None: datetime.datetime.fromtimestamp(record.created, datetime.timezone.utc).astimezone().isoformat(sep="T", timespec="milliseconds"))
    return formatter


def _standard_stream_formatter():
    formatter = logging.Formatter("%(levelname)s | %(name)s | %(message)s")
    return formatter
