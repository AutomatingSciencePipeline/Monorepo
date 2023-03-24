from enum import Enum
from pydantic import BaseModel, validator, root_validator


class ParamType(Enum):
    BOOL = "bool"
    INTEGER = "integer"
    FLOAT = "float"
    STRING = 'string'


class Parameter(BaseModel):
    type: ParamType


class BoolParameter(Parameter):
    default: bool


class StringParameter(Parameter):
    default: str


def _check_bounds(values):
    start, stop = values.get('min'), values.get('max')
    if start > stop:
        raise ValueError("Min value cannot be greater than max value")
    return values


class IntegerParam(Parameter):
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