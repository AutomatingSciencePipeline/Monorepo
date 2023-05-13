import configparser
import itertools
import os
from modules.data.configData import ConfigData
from modules.data.experiment import ExperimentData

from modules.data.parameters import ParamType, BoolParameter, FloatParam, IntegerParam, Parameter, StringParameter
from modules.exceptions import GladosInternalError
from modules.logging.gladosLogging import get_experiment_logger

FilePath = str

explogger = get_experiment_logger()

def float_range(start: float, stop: float, step=1.0):
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1


def generate_list(param: Parameter, paramName):
    if param.type == ParamType.INTEGER:
        intParam = IntegerParam(**param.dict())
        return [(paramName, i) for i in range(intParam.min, intParam.max, intParam.step)]
    elif param.type == ParamType.FLOAT:
        floatParam = FloatParam(**param.dict())
        return [(paramName, i) for i in float_range(floatParam.min, floatParam.max, floatParam.step)]
    elif param.type == ParamType.BOOL:
        return [(paramName, val) for val in [True, False]]
    else: #This will never happen
        return []


def generate_config_files(experiment: ExperimentData):
    constants = {}
    parameters = {}
    gather_parameters(experiment.hyperparameters, constants, parameters)

    configDict = {}
    configIdNumber = 0
    for varyingKey, varyingVar in parameters.items():
        explogger.info(f'Keeping {varyingVar} constant')
        possibleParamVals = []

        #Required to do the cross product, since each config is made by
        #doing a cross product of lists of name value pairs the default variable needs to be
        #a single item list so that there is only one possible value for the default variable
        possibleParamVals.append(generate_list(varyingVar, varyingKey))

        for otherKey, otherVar in parameters.items():
            if otherKey != varyingKey:
                possibleParamVals.append([(otherKey, get_default(otherVar))])
        try:
            permutations = list(itertools.product(*possibleParamVals))
        except Exception as err:
            raise GladosInternalError("Error while making permutations") from err

        for thisPermutation in permutations:
            configItems = {}
            for item in thisPermutation:
                name = item[0]
                value = item[1]
                configItems[name] = value
            configItems.update(constants)
            configDict[f'config{configIdNumber}'] = ConfigData(data=configItems)
            explogger.info(f'Generated config {configIdNumber}')
            configIdNumber += 1

    explogger.info("Finished generating configs")
    experiment.configs = configDict
    return configIdNumber


def create_config_from_data(experiment: ExperimentData, configNum: int):
    """
    Call this function when inside the experiment folder!
    """
    if experiment.configs == {}:
        explogger.info(f"Configs for experiment{experiment.expId} is Empty at create_config_from_data, Config File will be empty")
    try:
        configData = experiment.configs[f'config{configNum}'].data
    except KeyError as err:  #TODO: Discuss how we handle this error
        msg = f"There is no config {configNum} cannot generate this config, there are only {len(experiment.configs)} configs"
        explogger.exception(err)
        raise GladosInternalError(msg) from err

    os.chdir('configFiles')
    outputConfig = configparser.ConfigParser()
    outputConfig.optionxform = str  # type: ignore # Must use this to make the file case sensitive, but type checker is unhappy without this ignore rule
    outputConfig["DEFAULT"] = configData
    with open(f'{configNum}.ini', 'w', encoding="utf8") as configFile:
        outputConfig.write(configFile)
        configFile.write(experiment.dumbTextArea)
        configFile.close()
        explogger.info(f"Wrote config{configNum} to a file")
    os.chdir('..')
    return f'{configNum}.ini'


def get_default(parameter: Parameter):
    if parameter.type == ParamType.INTEGER:
        return IntegerParam(**parameter.dict()).default
    elif parameter.type == ParamType.FLOAT:
        return FloatParam(**parameter.dict()).default
    elif parameter.type == ParamType.BOOL:
        return BoolParameter(**parameter.dict()).default
    elif parameter.type == ParamType.STRING:
        return StringParameter(**parameter.dict()).default
    else:
        raise GladosInternalError(f'Parameter {parameter} has an unsupported type')


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
                    explogger.warning(f'param {parameterKey} has the same min and max value; converting to constant')
                    constants[parameterKey] = param.min
                else:  #Varies adding to batch
                    explogger.info(f'param {parameterKey} varies, adding to batch')
                    parameters[parameterKey] = param
            elif parameterType == ParamType.STRING:  #Strings never vary technically should be in the constants section now
                stringParam = StringParameter(**hyperparameter.dict())
                explogger.warning(f'param {parameterKey} is a string, adding to constants')
                constants[parameterKey] = stringParam.default
            elif parameterType == ParamType.BOOL:
                explogger.info(f'param {parameterKey} varies, adding to batch')
                parameters[parameterKey] = hyperparameter
            else:
                msg = f'ERROR DURING CONFIG GEN: param {parameterKey} {hyperparameter} Does not have a supported type'
                raise GladosInternalError(msg)
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
