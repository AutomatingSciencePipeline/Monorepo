import json
from typing import List
from experiment import ExperimentData
from modules.data.experiment import ExperimentType
from modules.data.parameters import BoolParameter, FloatParam, Parameter, ParamType, IntegerParam, StringParameter

# TODO move this out to test files later
if __name__ == "__main__":
    print("hello world")

    expInfo = {'trialExtraFile': 'dummy',
               'description': '',
               'type': ExperimentType.PYTHON.value, #Doesn't exist in firebase TODO: Make optional?
               'file': 'experimentV3dpcllHWPrK1Kgbyzqb',
               'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2',
               'finished': False,
               'estimatedTotalTimeMinutes': 0,
               'dumbTextArea': 'dummy = dummy\na = 100',
               'verbose': True,
               'scatterIndVar': 'iparam',
               'scatterDepVar': 'fparam',
               'timeout': 18000, 'workers': 1,
               'keeplogs': True, #'keepLogs': True, L is capatilized on the frontend #TODO: change backend or frontend?
               'hyperparameters': '{"hyperparameters":[{"name":"iparam","default":"1","min":"1","max":"10","step":"1","type":"integer"},{"name":"fparam","default":"1.0","min":"1.0","max":"10.0","step":"1.0","type":"float"},{"name":"bparam","default":"false","type":"bool"},{"name":"sparam","default":"VALUE","type":"string"}]}',
               'name': 'Just to get the datA',
               'trialResult': 'dummy',
               'expToRun': 0, #This is totalExperimentRuns in the data type 
               'created': 1679705027850,
               'scatter': True,
               'id': 'V3dpcllHWPrK1Kgbyzqb' #'expId': 'V3dpcllHWPrK1Kgbyzqb' #TODO: change backend or frontend?
               }
    hyperparameters = json.loads(expInfo['hyperparameters'])['hyperparameters']
    lst = {}
    for param in hyperparameters:
        name = param['name']
        del param['name']
        if param['type'] == 'integer':
            param['type'] = ParamType.INTEGER
            lst[name] = IntegerParam(**param)
        elif param['type'] =='float':
            param['type'] = ParamType.FLOAT
            lst[name] = FloatParam(**param)
        elif param['type'] == 'bool':
            param['type'] = ParamType.BOOL
            lst[name] = BoolParameter(**param)
        elif param['type'] == 'string':
            param['type'] = ParamType.STRING
            lst[name] = StringParameter(**param)
    print(lst)
    expInfo['hyperparameters'] = lst
    exp = ExperimentData(**expInfo)
    print(exp)
    
    # intParamInfo = {"type": ParamType.INTEGER, "min": 0, "max": 10, "default": 1, "step": 1}
    # param: Parameter = IntegerParam(**intParamInfo)
    # print(isinstance(param, Parameter))
    # experimentInfo = {
    #     "hyperparameters": {"x": param},
    #     "type": ExperimentType.PYTHON.value,
    #     "id": "dummy",
    #     "file": "dummy",
    #     "creator": "dummy",
    #     "keeplogs": True,
    #     "timeout": 1000,
    #     "dumbTextArea": "",
    #     "trialResult": "dummy",
    #     "scatter": False
    # }
    # print(isinstance(experimentInfo["hyperparameters"]["x"], Parameter))
    # experiment = ExperimentData(**experimentInfo)

    # l: List[Parameter] = [param]
    # for param in l:
    #     if param.type == ParamType.INTEGER:
    #         intParam: IntegerParam = IntegerParam(**param.dict())
