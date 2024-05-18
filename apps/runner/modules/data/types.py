from enum import Enum
from typing import Any, Dict, TypedDict

DocumentId = str
UserId = str
EpochMilliseconds = int


class IncomingStartRequest(TypedDict):
    experiment: "Dict[str, Any]"


class ResultStatus(Enum):
    UNKNOWN = "unknown"
    SUCCESS = "success"
    FAIL = "fail"
    SYSTEM_ERROR = "system_error"
