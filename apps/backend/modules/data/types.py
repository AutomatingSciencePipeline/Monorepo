from enum import Enum

DocumentId = str
UserId = str
EpochMilliseconds = int


class ResultStatus(Enum):
    UNKNOWN = "unknown"
    SUCCESS = "success"
    FAIL = "fail"
    SYSTEM_ERROR = "system_error"
