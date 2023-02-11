import configparser
import itertools
import os

from modules.exceptions import GladosInternalError

DEFAULT_STEP_INT = 1
DEFAULT_STEP_FLOAT = 0.1

FilePath = str


def float_range(start: float, stop: float, step=1.0):
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1


def generate_list(otherVar, paramspos):
    if otherVar['type'] == 'integer':
        step = DEFAULT_STEP_INT if otherVar['step'] == '' or int(otherVar['step']) == 0 else otherVar['step']
        if otherVar['max'] == otherVar['min']:
            otherVar['max'] = int(otherVar['max']) + int(step)
        paramspos.append([(otherVar['name'], i) for i in range(int(otherVar['min']), int(otherVar['max']), int(step))])
    elif otherVar['type'] == 'float':
        step = DEFAULT_STEP_FLOAT if otherVar['step'] == '' or float(otherVar['step']) == 0 else otherVar['step']
        if otherVar['max'] == otherVar['min']:
            otherVar['max'] = float(otherVar['max']) + float(step)
        paramspos.append([(otherVar['name'], i) for i in float_range(float(otherVar['min']), float(otherVar['max']), float(step))])
    elif otherVar['type'] == 'string':
        paramspos.append([(otherVar['name'], otherVar['default'])])
    elif otherVar['type'] == 'bool':
        paramspos.append([(otherVar['name'], val) for val in [True, False]])


def generate_consts(toParse: str):
    constants = {}
    if toParse != '':
        parsedLst = toParse.split('\n')
        #Splits each element of the parsed list on = then strips extra white space, programming scheme style! (Sorry Rob)
        fullyParsed = list(map(lambda unparsedConst: map(lambda ind: ind.strip(), unparsedConst.split('=')), parsedLst))
        for key, val in fullyParsed:
            constants[key] = val
    return constants


def generate_config_files(hyperparams, unparsedConstInfo):
    os.mkdir('configFiles')
    os.chdir('configFiles')
    configIdNumber = 0
    constants = generate_consts(unparsedConstInfo)
    parameters = []
    configs = []
    gather_parameters(hyperparams, constants, parameters)

    for defaultVar in parameters:
        print(f'Keeping {defaultVar} constant')
        try:
            paramspos = []
            default = [(defaultVar['name'], defaultVar['default'])]
            paramspos.append(default)
        except KeyError as err:
            print(f"Some sorta error with accessing default {err}")
            return None
        for otherVar in hyperparams:
            if otherVar['name'] != defaultVar['name']:
                try:
                    generate_list(otherVar, paramspos)
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
                configFile.close()
                print(f"Finished writing config {configIdNumber}")
            configIdNumber += 1
    os.chdir('..')
    print("Finished generating configs")
    return configs


def gather_parameters(hyperparams, constants, parameters):
    for hyperparameter in hyperparams:
        try:
            parameterType = hyperparameter['type']
            parameterKey = hyperparameter['name']
            if (parameterType in ('integer', 'float')) and hyperparameter['min'] == hyperparameter['max']:
                print(f'param {parameterKey} has the same min and max value; converting to constant')
                constants[parameterKey] = hyperparameter['min']
            elif parameterType == 'string':
                print('param ' + parameterKey + ' is a string, adding to constants')
                constants[parameterKey] = hyperparameter['default']
            else:
                print('param ' + parameterKey + ' varies, adding to batch')
                parameters.append(hyperparameter)
        except KeyError as err:
            raise GladosInternalError('Error during finding constants') from err


def get_config_paramNames(configfile: FilePath):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = list(config['DEFAULT'].keys())
    res.sort()
    return res


def get_configs_ordered(configfile: FilePath, names: "list[str]"):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = [config["DEFAULT"][key] for key in names]
    return res
