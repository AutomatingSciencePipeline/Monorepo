from typing import Dict, Optional
from enum import Enum
from pydantic import BaseModel, root_validator, validator
from modules.data.configData import ConfigData

from modules.data.parameters import Parameter
from modules.data.types import DocumentId, EpochMilliseconds, UserId


class ExperimentType(Enum):
    UNKNOWN = "unknown"
    PYTHON = "python"
    JAVA = "java"


class ExperimentData(BaseModel):

    experimentType = ExperimentType.UNKNOWN
    expId: DocumentId
    creator: UserId
    trialExtraFile: Optional[str]
    trialResult: str
    file = ""  #Will be set either by initializing or by app.py
    timeout: int
    keepLogs: bool
    scatter: bool
    scatterIndVar: Optional[str]
    scatterDepVar: Optional[str]
    dumbTextArea: str
    postProcess = False

    hyperparameters: Dict[str, Parameter]
    configs = {}  #Will be set Later

    startedAtEpochMillis: Optional[EpochMilliseconds]
    finishedAtEpochMillis: Optional[EpochMilliseconds]
    finished: Optional[bool]  # TODO replace with presence of finished timestamp?

    totalExperimentRuns = 0
    passes: Optional[int]
    fails: Optional[int]

    @validator('trialResult')
    @classmethod
    def check_trialResult(cls, v):
        if v == '':
            raise ValueError("Trial Result field cannot be empty")
        return v

    @validator('configs')
    @classmethod
    def check_configs(cls, v):
        for key, param in v.items():
            if not param.__class__ == ConfigData:
                raise ValueError(f'value {param} associated with {key} in configs is not a ConfigData object')
        return v

    @validator('timeout')
    @classmethod
    def check_timeout(cls, v):
        if v < 1:
            raise ValueError(f'value {v} is an invalid timeout, timeout must be greater than or equal to 1')
        return v

    @validator('hyperparameters')
    @classmethod
    def check_hyperparams(cls, v):
        for key, param in v.items():
            # For some reason, isinstance does not work here. Maybe it has to do with how pydantic validators work? - Rob
            if not param.__class__ in Parameter.__subclasses__():
                raise ValueError(f'value {param} associated with {key} in hyperparameters is not a Parameter')
            if key == '':
                raise ValueError(f'Key for parameter cannot be empty')
        return v

    @root_validator
    @classmethod
    def check_scatter_settings(cls, values):
        scatter, scatterIndVar, scatterDepVar = values.get('scatter'), values.get('scatterIndVar'), values.get('scatterDepVar')
        if scatter:
            if scatterIndVar == '' or scatterDepVar == '':
                raise ValueError("scatter is enabled, but scatterIndVar and/or scatterDepVar are absent")
        elif scatterIndVar != '' or scatterDepVar != '':
            raise ValueError("scatter is disabled, but scatterIndVar and/or scatterDepVar are present")
        return values

    def has_extra_files(self):
        return self.trialExtraFile != ''

    class Config:
        validate_assignment = True
