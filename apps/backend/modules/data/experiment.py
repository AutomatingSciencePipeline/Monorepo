from typing import Optional, TypedDict, cast
from enum import Enum
from trycast import trycast
from modules.data.parameters import Parameter
from modules.data.types import DocumentId, EpochMilliseconds, UserId
from pydantic import BaseModel, ValidationError, validator

# from modules.exceptions import DataFormatError


class ExperimentType(Enum):
    UNKNOWN = "unknown"
    PYTHON = "python"
    JAVA = "java"


class ExperimentData(BaseModel):
    type: ExperimentType
    id: DocumentId
    creator: UserId
    trialExtraFile: str
    trialResult: str
    file: str
    timeout: int
    keeplogs: bool
    scatter: bool
    scatterIndVar: Optional[str]
    scatterDepVar: Optional[str]
    dumbTextArea: str

    hyperparameters: dict

    startedAtEpochMillis: EpochMilliseconds
    finishedAtEpochMillis: EpochMilliseconds
    finished: bool  # TODO replace with presence of finished timestamp?

    totalExperimentRuns: int
    passes: int
    fails: int

    @validator('hyperparameters')
    @classmethod
    def check_hyperparams(cls, v):
        for key, param in v.items():
            if not isinstance(param, Parameter):
                raise ValueError(f'value {param} associated with {key} in hyperparameters is not a Parameter')
        return v

    @validator("scatterDepVar")
    @classmethod
    def check_scatter_validity(cls, scatterDepVar, values):
        scatter, scatterIndVar = values.get('scatter'), values.get('scatterIndVar')
        if scatter:
            if scatterIndVar is None or scatterDepVar is None:
                raise ValueError("ScatterIndVar or ScatterDepVar are not set while scatter is true")
        return scatterDepVar


# class ExperimentData(TypedDict):
#     id: DocumentId
#     creator: UserId

#     # TODO document has field expId that duplicates its own id

#     name: str
#     description: str

#
#     fileOutput: str
#     file: str
#     resultOutput: str

#     params: str  # TODO this is actually a json object

#     created: EpochMilliseconds
#     startedAtEpochMillis: EpochMilliseconds
#     finishedAtEpochMillis: EpochMilliseconds
#     finished: bool  # TODO replace with presence of finished timestamp?

#     totalExperimentRuns: int
#     passes: int
#     fails: int

#     scatter: bool
#     scatterDepVar: Optional[str]
#     scatterIndVar: Optional[str]

#     # TODO unused by us
#     verbose: bool
#     workers: int

#     # def __init__(self, data_dict):
#     #   self.id = data_dict['id']

# def experiment_from_dict(data_dict: dict) -> ExperimentData:
#     # https://pypi.org/project/trycast/
#     # https://adamj.eu/tech/2021/05/10/python-type-hints-how-to-use-typeddict/
#     # https://dafoster.net/projects/typeddict/
#     experiment = trycast(data_dict, ExperimentData)
#     if experiment is None:
#         raise DataFormatError(f'Input dictionary {data_dict} did not match the Experiment data type (is it missing some fields, or mismatched types?)')
#     return cast(ExperimentData, experiment)
