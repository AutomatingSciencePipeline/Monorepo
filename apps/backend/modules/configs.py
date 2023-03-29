import configparser
import itertools
import os
from modules.data.experiment import ExperimentData

from modules.data.parameters import ParamType, BoolParameter, FloatParam, IntegerParam, Parameter, StringParameter
from modules.exceptions import GladosInternalError


FilePath = str


def float_range(start: float, stop: float, step=1.0):
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1


def generate_list(param: Parameter, paramName, paramspos):
    if param.type == ParamType.INTEGER:
        intParam = IntegerParam(**param.dict())
        paramspos.append([(paramName, i) for i in range(intParam.min, intParam.max, intParam.step)])
    elif param.type == ParamType.FLOAT:
        floatParam = FloatParam(**param.dict())
        paramspos.append([(paramName, i) for i in float_range(floatParam.min, floatParam.max, floatParam.step)])
    elif param.type == ParamType.BOOL:
        paramspos.append([(paramName, val) for val in [True, False]])


def generate_config_files(experiment: ExperimentData):
    hyperparams = experiment.hyperparameters
    unparsedConstInfo = experiment.dumbTextArea
    os.mkdir('configFiles')
    os.chdir('configFiles')
    configIdNumber = 0
    constants = {}
    parameters = {}
    configs = []
    gather_parameters(hyperparams, constants, parameters)

    for defaultKey, defaultVar in parameters.items():
        print(f'Keeping {defaultVar} constant')
        paramspos = []
        default = [(defaultKey, get_default(defaultVar))]
        paramspos.append(default)
        
        for otherKey, otherVar in parameters.items():
            if otherKey != defaultKey:
                try:
                    generate_list(otherVar, otherKey,paramspos)
                except KeyError as err:
                    raise GladosInternalError('Error during list generation') from err
        try:
            permutations = list(itertools.product(*paramspos))
        except Exception as err:
            raise GladosInternalError("Error while making permutations") from err

        for thisPermutation in permutations:
            outputConfig = configparser.ConfigParser()
            outputConfig.optionxform = str  # type: ignore # Must use this to make the file case sensitive, but type checker is unhappy without this ignore rule
            configItems = {}
            for item in thisPermutation:
                configItems[item[0]] = item[1]
            configItems.update(constants)
            configs.append(configItems)
            outputConfig["DEFAULT"] = configItems
            with open(f'{configIdNumber}.ini', 'w', encoding="utf8") as configFile:
                outputConfig.write(configFile)
                configFile.write(unparsedConstInfo)
                configFile.close()
                print(f"Finished writing config {configIdNumber}")
            configIdNumber += 1
    os.chdir('..')
    print("Finished generating configs")
    return configs

def get_default(parameter):
    if parameter.type == ParamType.INTEGER:
        return IntegerParam(**parameter.dict()).default
    elif parameter.type == ParamType.FLOAT:
        return FloatParam(**parameter.dict()).default
    elif parameter.type == ParamType.BOOL:
        return BoolParameter(**parameter.dict()).default
    elif parameter.type == ParamType.STRING:
        return StringParameter(**parameter.dict()).default

def gather_parameters(hyperparams, constants, parameters):
    for parameterKey, hyperparameter in hyperparams.items():
        try:
            parameterType = hyperparameter.type
            if parameterType in (ParamType.INTEGER, ParamType.FLOAT):
                if parameterType == ParamType.INTEGER:
                    param = IntegerParam(**hyperparameter.dict())
                else:
                    param = FloatParam(**hyperparameter.dict())
                #Since we already know if param will be an integer or a float we can access min and max without messing anything up
                if param.min == param.max:
                    print(f'param {parameterKey} has the same min and max value; converting to constant')
                    constants[parameterKey] = param.min
                else:
                    parameters[parameterKey] = param
            elif parameterType == ParamType.STRING:
                stringParam = StringParameter(**hyperparameter.dict())
                print('param ' + parameterKey + ' is a string, adding to constants')
                constants[parameterKey] = stringParam.default
            else:
                print('param ' + parameterKey + ' varies, adding to batch')
                parameters[parameterKey] = hyperparameter
        except KeyError as err:
            raise GladosInternalError('Error during finding constants') from err


def get_config_paramNames(configfile: FilePath):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = []
    for section in list(config):
        res += [key for key in list(config[section]) if key not in res]
    res.sort()
    return res


def get_configs_ordered(configfile: FilePath, parameterNames: "list[str]"):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = []
    for key in parameterNames:
        for index, section in enumerate(list(config)):
            try:
                val = config[section][key]
                res.append(val)
                break
            except KeyError as err:
                if index >= len(parameterNames):
                    raise GladosInternalError(f"Somehow the parameter name {key} was not in any of the config sections") from err
    return res
