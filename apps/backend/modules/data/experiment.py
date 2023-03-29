from typing import Optional
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
    file: str
    timeout: int
    keepLogs: bool
    scatter: bool
    scatterIndVar: Optional[str]
    scatterDepVar: Optional[str]
    dumbTextArea: str
    postProcess = False

    hyperparameters: dict
    configs = {}

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
    
    @validator('hyperparameters')
    @classmethod
    def check_hyperparams(cls, v):
        for key, param in v.items():
            # For some reason, isinstance does not work here. Maybe it has to do with how pydantic validators work? - Rob
            if not param.__class__ in Parameter.__subclasses__():
                raise ValueError(f'value {param} associated with {key} in hyperparameters is not a Parameter')
        return v

    @root_validator
    @classmethod
    def check_scatter_settings(cls, values):
        scatter, scatterIndVar, scatterDepVar = values.get('scatter'), values.get('scatterIndVar'), values.get('scatterDepVar')
        print(f"the values are {scatter}, {scatterIndVar}, {scatterDepVar}")
        if scatter:
            if scatterIndVar is None or scatterDepVar is None:
                raise ValueError("scatter is enabled, but scatterIndVar and/or scatterDepVar are absent")
        elif scatterIndVar == '' or scatterDepVar == '':
            raise ValueError("scatter is disabled, but scatterIndVar and/or scatterDepVar are present")
        return values
    class Config:
        validate_assignment = True
    
