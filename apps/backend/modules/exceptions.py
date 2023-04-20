# TODO not sure if we need flask error because flask won't be the final one reporting the failure
# https://flask.palletsprojects.com/en/2.2.x/errorhandling/#returning-api-errors-as-json
class CustomFlaskError(Exception):
    status_code = 500

    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv


class GladosUserError(CustomFlaskError):
    """Something went wrong but the user is probably to blame"""
    status_code = 400


class GladosInternalError(CustomFlaskError):
    """Something went wrong but the system is probably to blame"""
    status_code = 500


class DataFormatError(Exception):
    """GLADOS data was not in an expected format"""


class FileHandlingError(GladosInternalError):
    """Something went wrong with GLADOS handling of files on the machine"""


class InternalTrialFailedError(GladosInternalError):
    """A trial failed for a reason having to do with GLADOS (the trial not passing is not a reason to throw this)"""


class TrialTimeoutError(GladosUserError):
    """A Trial took too long to complete"""


class ExperimentAbort(Exception):
    """The system should stop running the entire experiment"""
