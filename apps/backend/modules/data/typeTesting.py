import json
import os
from typing import List
from app import parseParams
from experiment import ExperimentData
from modules.configs import create_config_from_data, gather_parameters, generate_config_files, generate_list, get_default
from modules.data.experiment import ExperimentType
from modules.data.parameters import BoolParameter, FloatParam, Parameter, ParamType, IntegerParam, StringParameter

# TODO move this out to test files later
if __name__ == "__main__":
    print("hello world")

    expInfo = {
        'trialExtraFile': 'dummy',
        'description': '',
        'type': ExperimentType.PYTHON.value,  #Doesn't exist in firebase TODO: Make optional?
        'file': 'experimentV3dpcllHWPrK1Kgbyzqb',
        'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2',
        'finished': False,
        'estimatedTotalTimeMinutes': 0,
        'dumbTextArea': 'dummy = dummy\na = 100',
        'verbose': True,
        'scatterIndVar': 'iparam',
        'scatterDepVar': 'fparam',
        'timeout': 18000,
        'workers': 1,
        'keepLogs': True,
        'hyperparameters': '{"hyperparameters":[{"name":"iparam","default":"1","min":"1","max":"10","step":"1","type":"integer"},{"name":"fparam","default":"1.0","min":"1.0","max":"10.0","step":"1.0","type":"float"}]}',
        'name': 'Just to get the datA',
        'trialResult': 'dummy',
        'totalExperimentRuns': 0,
        'created': 1679705027850,
        'scatter': True,
        'expId': 'V3dpcllHWPrK1Kgbyzqb'
    }
    hyperparameters = parseParams(json.loads(expInfo['hyperparameters'])['hyperparameters'])
    expInfo['hyperparameters'] = hyperparameters
    experiment = ExperimentData(**expInfo)
    generate_config_files(experiment)

    for configId, config in experiment.configs.items():
        print(f'{configId}: {config.data}\n')
