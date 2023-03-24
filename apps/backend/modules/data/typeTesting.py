from typing import List
from experiment import ExperimentData
from modules.data.experiment import ExperimentType
from modules.data.parameters import Parameter, ParamType, IntegerParam

# TODO move this out to test files later
if __name__ == "__main__":
    print("hello world")

    intParamInfo = {"type": ParamType.INTEGER, "min": 0, "max": 10, "default": 1, "step": 1}
    param: Parameter = IntegerParam(**intParamInfo)
    print(isinstance(param, Parameter))

    experimentInfo = {
        "hyperparameters": {"x": param},
        "type": ExperimentType.PYTHON.value,
        "id": "dummy",
        "file": "dummy",
        "creator": "dummy",
        "keeplogs": True,
        "timeout": 1000,
        "dumbTextArea": "",
        "trialResult": "dummy",
        "scatter": False
    }
    print(isinstance(experimentInfo["hyperparameters"]["x"], Parameter))
    experiment = ExperimentData(**experimentInfo)

    l: List[Parameter] = [param]
    for param in l:
        if param.type == ParamType.INTEGER:
            intParam: IntegerParam = IntegerParam(**param.dict())
