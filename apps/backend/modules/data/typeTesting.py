from parameters import Parameter, ParamType, IntegerParam
from typing import List

##THIS CAN BE REMOVED LATER THIS IS PURELY FOR TESTING
if __name__ == "__main__":
    print("hello world")
    intParamInfo = {"type": ParamType.INTEGER, "min": 0, "max": 10, "default": 1, "step": 1}
    param: Parameter = IntegerParam(**intParamInfo)
    print(isinstance(param,Parameter))
    l: List[Parameter] = [param]
    for param in l:
        if param.type == ParamType.INTEGER:
            intParam: IntegerParam = IntegerParam(**param.dict())