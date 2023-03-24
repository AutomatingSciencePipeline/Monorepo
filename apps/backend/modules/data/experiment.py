from typing import Optional
from enum import Enum
from pydantic import BaseModel, root_validator, validator

from modules.data.parameters import Parameter
from modules.data.types import DocumentId, EpochMilliseconds, UserId

# from modules.exceptions import DataFormatError


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
