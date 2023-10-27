import logging

logging.info('Starting logging try me')

logger = logging.getLogger('helloworld')

logger.setLevel(logging.DEBUG)

debug_file_log = logging.FileHandler(filename="TESTING.DEBUG.log", encoding="utf-8")
debug_file_log.setLevel(logging.DEBUG)
logger.addHandler(debug_file_log)

logger.debug('This message should go to only the first log file')

debug_file_log.close()
logger.removeHandler(debug_file_log)

debug_file_log_2 = logging.FileHandler(filename="TESTING2.DEBUG.log", encoding="utf-8")
debug_file_log_2.setLevel(logging.DEBUG)
logger.addHandler(debug_file_log_2)

logger.debug('This message should go to only the second log file')

debug_file_log_2.close()

logging.info('Logging try me concluded')
