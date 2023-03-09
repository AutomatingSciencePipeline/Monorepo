from modules.data.experiment import ExperimentData
from modules.data.types import ResultStatus


class Trial():
    parentExperiment: ExperimentData
    status = ResultStatus.UNKNOWN
    startTimeEpochMillis: int
    endTimeEpochMillis: int

    def succeeded(self):
        return self.status is ResultStatus.SUCCESS

    def failed(self):
        return self.status in (ResultStatus.FAIL, ResultStatus.SYSTEM_ERROR)
