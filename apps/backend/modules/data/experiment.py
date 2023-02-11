from typing import Optional, TypedDict, cast
from trycast import trycast

from modules.exceptions import DataFormatError

DocumentId = str
UserId = str
EpochMilliseconds = int


class ExperimentData(TypedDict):
    id: DocumentId
    creator: UserId

    # TODO document has field expId that duplicates its own id

    name: str
    description: str

    fileOutput: str
    file: str
    resultOutput: str

    params: str  # TODO this is actually a json object

    created: EpochMilliseconds
    startedAtEpochMillis: EpochMilliseconds
    finishedAtEpochMillis: EpochMilliseconds
    finished: bool  # TODO replace with presence of finished timestamp?

    totalExperimentRuns: int
    passes: int
    fails: int

    scatter: bool
    scatterDepVar: Optional[str]
    scatterIndVar: Optional[str]

    # TODO unused by us
    verbose: bool
    workers: int

    # def __init__(self, data_dict):
    #   self.id = data_dict['id']


def experiment_from_dict(data_dict: dict) -> ExperimentData:
    # https://pypi.org/project/trycast/
    # https://adamj.eu/tech/2021/05/10/python-type-hints-how-to-use-typeddict/
    # https://dafoster.net/projects/typeddict/
    experiment = trycast(data_dict, ExperimentData)
    if experiment is None:
        raise DataFormatError(f'Input dictionary {data_dict} did not match the Experiment data type (is it missing some fields, or mismatched types?)')
    return cast(ExperimentData, experiment)
