from enum import Enum
from pydantic import BaseModel, validator


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


class IntegerParam(Parameter):
    default: int
    min: int
    max: int
    step: int

    @validator('max')
    @classmethod
    def check_max(cls, stop, values):
        start = values.get('min')
        if start > stop:
            raise ValueError("Min value cannot be greater than max value")
        return stop

    @validator('step')
    @classmethod
    def check_step(cls, step):
        if step <= 0:
            raise ValueError("Step value cannot be less than 1")
        return step


class FloatParam(Parameter):
    default: float
    min: float
    max: float
    step: float

    @validator('max')
    @classmethod
    def check_max(cls, stop, values):
        start = values.get('min')
        if start > stop:
            raise ValueError("Min value cannot be greater than max value")
        return stop

    @validator('step')
    @classmethod
    def check_step(cls, step):
        if step <= 0:
            raise ValueError("Step value cannot be less than or equal to 0")
        return step
