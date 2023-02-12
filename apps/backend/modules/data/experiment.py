from enum import Enum


class ExperimentType(Enum):
    UNKNOWN = -1
    PYTHON = 0
    JAVA = 1


class Experiment():
    type: ExperimentType
