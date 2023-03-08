from enum import Enum

from modules.data.experiment import Experiment


class ResultStatus(Enum):
    UNKNOWN = -1
    SUCCESS = 0
    FAIL = 1
    SYSTEM_ERROR = 2


class Trial():
    parentExperiment: Experiment
    status = ResultStatus.UNKNOWN
    startTimeEpochMillis: int
    endTimeEpochMillis: int

    def succeeded(self):
        return self.status is ResultStatus.SUCCESS

    def failed(self):
        return self.status in (ResultStatus.FAIL, ResultStatus.SYSTEM_ERROR)
