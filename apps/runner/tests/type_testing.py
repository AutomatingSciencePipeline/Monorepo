import json
from modules.data.parameters import parseRawHyperparameterData
from modules.configs import generate_config_files
from modules.data.experiment import ExperimentType, ExperimentData

# This file shows how to construct an ExperimentData object from a JSON string
# This approach can help in writing tests for that functionality, after that, this file can be deleted
if __name__ == "__main__":
    print("hello world")

    # cspell:disable # disable spellchecker
    expInfo = {
        'trialExtraFile': 'dummy',
        'description': '',
        'type': ExperimentType.PYTHON.value,
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
        'hyperparameters': '{"hyperparameters":[{"name":"iparam","default":"1","min":"1","max":"10","step":"1","type":"integer"},{"name":"fparam","default":"1.0","min":"1.0","max":"10.0","step":"1.0","type":"float"},{"name":"sparam","default":"Hi","type":"string"},{"name":"bparam","default":true,"type":"bool"}]}',
        'name': 'Just to get the datA',
        'trialResult': 'dummy',
        'totalExperimentRuns': 0,
        'created': 1679705027850,
        'scatter': True,
        'expId': 'V3dpcllHWPrK1Kgbyzqb'
    }
    # cspell:enable
    hyperparameters = parseRawHyperparameterData(json.loads(expInfo['hyperparameters'])['hyperparameters'])
    expInfo['hyperparameters'] = hyperparameters
    experiment = ExperimentData(**expInfo)
    generate_config_files(experiment)

    for configId, config in experiment.configs.items():
        print(f'{configId}: {config.data}\n')