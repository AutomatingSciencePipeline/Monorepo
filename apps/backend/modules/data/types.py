from enum import Enum

DocumentId = str
UserId = str
EpochMilliseconds = int


class ResultStatus(Enum):
    UNKNOWN = -1
    SUCCESS = 0
    FAIL = 1
    SYSTEM_ERROR = 2
