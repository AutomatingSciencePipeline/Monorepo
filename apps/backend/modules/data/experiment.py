from typing import Optional
from enum import Enum
from pydantic import BaseModel, root_validator, validator

from modules.data.parameters import Parameter
from modules.data.types import DocumentId, EpochMilliseconds, UserId

class ExperimentType(Enum):
    UNKNOWN = "unknown"
    PYTHON = "python"
    JAVA = "java"


class ExperimentData(BaseModel):
    type: ExperimentType
    id: DocumentId
    creator: UserId
    trialExtraFile: Optional[str]
    trialResult: str
    file: str
    timeout: int
    keeplogs: bool
    scatter: bool
    scatterIndVar: Optional[str]
    scatterDepVar: Optional[str]
    dumbTextArea: str

    hyperparameters: dict

    startedAtEpochMillis: Optional[EpochMilliseconds]
    finishedAtEpochMillis: Optional[EpochMilliseconds]
    finished: Optional[bool]  # TODO replace with presence of finished timestamp?

    totalExperimentRuns: Optional[int]
    passes: Optional[int]
    fails: Optional[int]

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
        elif scatterIndVar is not None or scatterDepVar is not None:
            raise ValueError("scatter is disabled, but scatterIndVar and/or scatterDepVar are present")
        return values
