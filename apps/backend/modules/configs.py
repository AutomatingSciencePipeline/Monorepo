import configparser
import itertools
import os

DEFAULT_STEP_INT = 1
DEFAULT_STEP_FLOAT = 0.1


def float_range(start: float, stop: float, step=1.0):
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1


def gen_list(otherVar, paramspos):
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


def gen_consts(toParse: str):
    res = {}
    if toParse != '':
        parsedLst = toParse.split('\n')
        #Splits each element of the parsed list on = then strips extra white space, programming scheme style! (Sorry Rob)
        fullyParsed = list(map(lambda unparsedConst: map(lambda ind: ind.strip(), unparsedConst.split('=')), parsedLst))
        for const, val in fullyParsed:
            res[const] = val
    return res


def gen_configs(hyperparams, unparsedConstInfo):
    os.mkdir('configFiles')
    os.chdir('configFiles')
    configIdNumber = 0
    constants = gen_consts(unparsedConstInfo)
    parameters = []
    configs = []
    for param in hyperparams:
        try:
            if (param['type'] == 'integer' or param['type'] == 'float') and param['min'] == param['max']:
                print('param ' + param['name'] + ' has the same min and max value converting to constant')
                constants[param['name']] = param['min']
            elif param['type'] == 'string':
                print('param ' + param['name'] + ' is a string, adding to constants')
                constants[param['name']] = param['default']
            else:
                print('param ' + param['name'] + ' varies, adding to batch')
                parameters.append(param)
        except KeyError as err:
            raise Exception(f'{err} during finding constants') from err

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
                    gen_list(otherVar, paramspos)
                except KeyError as err:
                    raise Exception(f'error {err} during list generation') from err
        try:
            permutations = list(itertools.product(*paramspos))
        except Exception as err:
            raise Exception(f"Error {err} while making permutations") from err
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


def get_config_paramNames(configfile):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = list(config['DEFAULT'].keys())
    res.sort()
    return res


def get_configs_ordered(configfile, names):
    config = configparser.ConfigParser()
    config.read(configfile)
    res = [config["DEFAULT"][key] for key in names]
    return res
