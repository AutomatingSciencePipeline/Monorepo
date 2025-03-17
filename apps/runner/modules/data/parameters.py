from enum import Enum
from pydantic import BaseModel, validator, root_validator
from typing import List

from modules.exceptions import GladosInternalError


class ParamType(Enum):
    BOOL = "bool"
    INTEGER = "integer"
    FLOAT = "float"
    STRING = "string"
    STRING_LIST = "stringlist"
    PARAMGROUP = "paramgroup"


class Parameter(BaseModel):
    type: ParamType


class BoolParameter(Parameter):
    type = ParamType.BOOL
    default: bool


class StringParameter(Parameter):
    type = ParamType.STRING
    default: str

class StringListParameter(Parameter):
    type = ParamType.STRING_LIST
    default: str
    values: List[str]
    
class ParamGroupParameter(Parameter):
    type = ParamType.PARAMGROUP
    default: str
    values: dict


def _check_bounds(values):
    start, stop = values.get('min'), values.get('max')
    if start > stop:
        raise ValueError("Min value cannot be greater than max value")
    return values


class IntegerParam(Parameter):
    type = ParamType.INTEGER
    default: int
    min: int
    max: int
    step: int

    @root_validator
    @classmethod
    def check_bounds(cls, values):
        return _check_bounds(values)

    @validator('step')
    @classmethod
    def check_step(cls, step: int):
        if step < 1:
            raise ValueError("Step value cannot be less than 1")
        return step


class FloatParam(Parameter):
    type = ParamType.FLOAT
    default: float
    min: float
    max: float
    step: float

    @root_validator
    @classmethod
    def check_bounds(cls, values):
        return _check_bounds(values)

    @validator('step')
    @classmethod
    def check_step(cls, step: float):
        if step <= 0:
            raise ValueError("Step value cannot be less than or equal to 0")
        return step


def parseRawHyperparameterData(hyperparameters):
    result = {}
    for entry in hyperparameters:
        entryType = entry['type']
        entryName = entry['name']
        del entry['name']

        if entryType == 'integer':
            entry['type'] = ParamType.INTEGER
            result[entryName] = IntegerParam(**entry)
        elif entryType == 'float':
            entry['type'] = ParamType.FLOAT
            result[entryName] = FloatParam(**entry)
        elif entryType == 'bool':
            entry['type'] = ParamType.BOOL
            result[entryName] = BoolParameter(**entry)
        elif entryType == 'string':
            entry['type'] = ParamType.STRING
            result[entryName] = StringParameter(**entry)
        elif entryType == 'stringlist':
            entry['type'] = ParamType.STRING_LIST
            result[entryName] = StringListParameter(**entry)
        elif entryType == 'paramgroup':
            entry['type'] = ParamType.PARAMGROUP
            result[entryName] = ParamGroupParameter(**entry)
        else:
            raise GladosInternalError(f"{entryType} (used by '{entryName}') is not a supported hyperparameter type")
    return result
