from typing import Dict
import unittest

from modules.configs import gather_parameters, generate_config_files, generate_list, get_default
from modules.data.configData import ConfigData
from modules.data.experiment import ExperimentData
from modules.data.parameters import BoolParameter, FloatParam, IntegerParam, ParamType, Parameter, StringParameter

intDefault, intStart, intStop, intStep, intStepInvalid, intConst = 0, 0, 5, 1, 0, 5
int_param_dict = {"default": intDefault, "min": intStart, "max": intStop, "step": intStep, "type": ParamType.INTEGER}
int_param_const_dict = {"default": intDefault, "min": intConst, "max": intConst, "step": intStep, "type": ParamType.INTEGER}
int_param = IntegerParam(**int_param_dict)
int_const_param = IntegerParam(**int_param_const_dict)

floatDefault, floatStart, floatStop, floatStep, invalidFloatStep, floatConst = 0.0, 0.0, 0.5, 0.1, 0, 0.5
float_param_dict = {"default": floatDefault, "min": floatStart, "max": floatStop, "step": floatStep, "type": ParamType.FLOAT}
float_param_const_dict = {"default": floatDefault, "min": floatConst, "max": floatConst, "step": floatStep, "type": ParamType.FLOAT}
float_param = FloatParam(**float_param_dict)
float_const_param = FloatParam(**float_param_const_dict)

bool_param = BoolParameter(**{"type": ParamType.BOOL, "default": True})
string_param = StringParameter(**{'type': ParamType.STRING, "default": "Weezer!"})

empty_hyperparams_dict = {}  #Empty dictionary
single_int_param_dict = {"x": int_param}
single_float_param_dict = {"x": float_param}
single_int_const_param_dict = {"x": int_const_param}
single_float_const_param_dict = {"x": float_const_param}
single_bool_param_dict = {"b": bool_param}
single_string_param_dict = {"s": string_param}
mixed_param_dict = {"x": int_param, "y": float_param, 'intconst': int_const_param, 'floatconst': float_const_param, 'b': bool_param, 's': string_param}


class TestGatherParameters(unittest.TestCase):

    const_result_dict = {}
    param_result_dict = {}

    def reset(self):
        self.empty_hyperparams_dict = {}  #Empty dictionary
        self.const_result_dict = {}
        self.param_result_dict = {}

    def test_gather_parameters_no_hyperparams(self):
        self.reset()
        gather_parameters(self.empty_hyperparams_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertFalse(self.param_result_dict)

    def test_gather_parameters_one_int_param(self):
        self.reset()
        gather_parameters(single_int_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertEqual(len(self.param_result_dict), 1)
        self.assertTrue("x" in self.param_result_dict)
        self.assertEqual(self.param_result_dict['x'], single_int_param_dict['x'])

    def test_gather_parameters_const_int_param(self):
        self.reset()
        gather_parameters(single_int_const_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 1)
        self.assertEqual(len(self.param_result_dict), 0)
        self.assertTrue("x" in self.const_result_dict)
        self.assertTrue(self.const_result_dict['x'], intConst)

    def test_gather_parameters_one_float_param(self):
        self.reset()
        gather_parameters(single_float_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertEqual(len(self.param_result_dict), 1)
        self.assertTrue("x" in self.param_result_dict)
        self.assertEqual(self.param_result_dict['x'], single_float_param_dict['x'])

    def test_gather_parameters_const_float_param(self):
        self.reset()
        gather_parameters(single_float_const_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 1)
        self.assertEqual(len(self.param_result_dict), 0)
        self.assertTrue("x" in self.const_result_dict)
        self.assertTrue(self.const_result_dict['x'], floatConst)

    def test_gather_parameters_bool_param(self):
        self.reset()
        gather_parameters(single_bool_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertEqual(len(self.param_result_dict), 1)
        self.assertTrue("b" in self.param_result_dict)
        self.assertTrue(self.param_result_dict['b'], single_bool_param_dict['b'])

    def test_gather_parameters_string_param(self):
        self.reset()
        gather_parameters(single_string_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 1)
        self.assertEqual(len(self.param_result_dict), 0)
        self.assertTrue("s" in self.const_result_dict)
        self.assertTrue(self.const_result_dict['s'], bool_param.default)

    def test_gather_parameters_two_param(self):
        self.reset()
        gather_parameters(mixed_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 3)
        self.assertEqual(len(self.param_result_dict), 3)
        self.assertTrue('x' in self.param_result_dict)
        self.assertTrue('y' in self.param_result_dict)
        self.assertTrue('b' in self.param_result_dict)
        self.assertTrue('intconst' in self.const_result_dict)
        self.assertTrue('floatconst' in self.const_result_dict)
        self.assertTrue('s' in self.const_result_dict)
        self.assertEqual(self.param_result_dict['x'], mixed_param_dict['x'])
        self.assertEqual(self.param_result_dict['y'], mixed_param_dict['y'])
        self.assertEqual(self.param_result_dict['b'], mixed_param_dict['b'])
        self.assertEqual(self.const_result_dict['intconst'], intConst)
        self.assertEqual(self.const_result_dict['floatconst'], floatConst)
        self.assertEqual(self.const_result_dict['s'], string_param.default)


class TestGenerateList(unittest.TestCase):
    int_list = [('x', 0), ('x', 1), ('x', 2), ('x', 3), ('x', 4)]
    float_list = [('y', 0.0), ('y', 0.1), ('y', 0.2), ('y', 0.3), ('y', 0.4)]
    bool_list = [('b', True), ('b', False)]

    possible_param_list = []

    def reset(self):
        self.possible_param_list = []

    def assertListOfFloatTuplesEqual(self, list1, list2):
        for item1, item2 in zip(list1, list2):
            self.assertEqual(item1[0], item2[0])
            self.assertAlmostEqual(item1[1], item2[1], delta=0.0001)

    def test_generate_int_list(self):
        self.reset()
        result = generate_list(int_param, 'x')
        self.assertListEqual(result, self.int_list)

    def test_generate_float_list(self):
        self.reset()
        result = generate_list(float_param, 'y')
        self.assertListOfFloatTuplesEqual(result, self.float_list)

    def test_generate_bool_list(self):
        self.reset()
        result = generate_list(bool_param, 'b')
        self.assertListEqual(result, self.bool_list)


class TestGenerateConfigFiles(unittest.TestCase):

    #Has an empty Hyperparameters
    exp_info = ExperimentData(**{'trialExtraFile': 'Testing Data', 'description': 'Testing Data', 'file': 'experimentV3dpcllHWPrK1Kgbyzqb', 'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2', 'finished': False, 'estimatedTotalTimeMinutes': 0, 'dumbTextArea': 'dummy = dummy\na = 100', 'verbose': True, 'scatterIndVar': 'iparam', 'scatterDepVar': 'fparam', 'timeout': 18000, 'workers': 1, 'keepLogs': True, 'hyperparameters': {}, 'name': 'Testing Data', 'trialResult': 'Testing Data', 'totalExperimentRuns': 0, 'created': 1679705027850, 'scatter': True, 'expId': 'V3dpcllHWPrK1Kgbyzqb'})

    single_int_param_hyperparams: Dict[str, Parameter] = {"x": int_param}
    single_int_param_expected_configs = {'config0': ConfigData(data={'x': 0}), 'config1': ConfigData(data={'x': 1}), 'config2': ConfigData(data={'x': 2}), 'config3': ConfigData(data={'x': 3}), 'config4': ConfigData(data={'x': 4})}

    single_float_param_hyperparams: Dict[str, Parameter] = {"x": float_param}
    single_float_param_expected_configs = {'config0': ConfigData(data={'x': 0.0}), 'config1': ConfigData(data={'x': 0.1}), 'config2': ConfigData(data={'x': 0.2}), 'config3': ConfigData(data={'x': 0.30000000000000004}), 'config4': ConfigData(data={'x': 0.4})}

    single_bool_param_hyperparams: Dict[str, Parameter] = {"b": bool_param}
    single_bool_param_expected_configs = {'config0': ConfigData(data={'b': True}), 'config1': ConfigData(data={'b': False})}

    single_int_const_hyperparams: Dict[str, Parameter] = {"x": int_param, 'xc': int_const_param}
    single_int_const_expected_configs = {'config0': ConfigData(data={'x': 0, 'xc': 5}), 'config1': ConfigData(data={'x': 1, 'xc': 5}), 'config2': ConfigData(data={'x': 2, 'xc': 5}), 'config3': ConfigData(data={'x': 3, 'xc': 5}), 'config4': ConfigData(data={'x': 4, 'xc': 5})}

    single_float_const_hyperparams: Dict[str, Parameter] = {"x": int_param, 'fc': float_const_param}
    single_float_const_expected_configs = {'config0': ConfigData(data={'x': 0, 'fc': 0.5}), 'config1': ConfigData(data={'x': 1, 'fc': 0.5}), 'config2': ConfigData(data={'x': 2, 'fc': 0.5}), 'config3': ConfigData(data={'x': 3, 'fc': 0.5}), 'config4': ConfigData(data={'x': 4, 'fc': 0.5})}

    single_string_const_hyperparams: Dict[str, Parameter] = {"x": int_param, 's': string_param}
    single_string_const_expected_configs = {'config0': ConfigData(data={'x': 0, 's': 'Weezer!'}), 'config1': ConfigData(data={'x': 1, 's': 'Weezer!'}), 'config2': ConfigData(data={'x': 2, 's': 'Weezer!'}), 'config3': ConfigData(data={'x': 3, 's': 'Weezer!'}), 'config4': ConfigData(data={'x': 4, 's': 'Weezer!'})}
    
    one_of_everything: Dict[str, Parameter] = {"x": int_param, "y": float_param, "b": bool_param, "s":string_param, "int_const": int_const_param, "float_const":float_param}
    one_of_everything_expected_configs = {'config0': ConfigData(data={'x': 0, 'y': 0.0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config1': ConfigData(data={'x': 1, 'y': 0.0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config2': ConfigData(data={'x': 2, 'y': 0.0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config3': ConfigData(data={'x': 3, 'y': 0.0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config4': ConfigData(data={'x': 4, 'y': 0.0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config5': ConfigData(data={'y': 0.0, 'x': 0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config6': ConfigData(data={'y': 0.1, 'x': 0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config7': ConfigData(data={'y': 0.2, 'x': 0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config8': ConfigData(data={'y': 0.30000000000000004, 'x': 0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config9': ConfigData(data={'y': 0.4, 'x': 0, 'b': True, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config10': ConfigData(data={'b': True, 'x': 0, 'y': 0.0, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config11': ConfigData(data={'b': False, 'x': 0, 'y': 0.0, 'float_const': 0.0, 's': 'Weezer!', 'int_const': 5}), 'config12': ConfigData(data={'float_const': 0.0, 'x': 0, 'y': 0.0, 'b': True, 's': 'Weezer!', 'int_const': 5}), 'config13': ConfigData(data={'float_const': 0.1, 'x': 0, 'y': 0.0, 'b': True, 's': 'Weezer!', 'int_const': 5}), 'config14': ConfigData(data={'float_const': 0.2, 'x': 0, 'y': 0.0, 'b': True, 's': 'Weezer!', 'int_const': 5}), 'config15': ConfigData(data={'float_const': 0.30000000000000004, 'x': 0, 'y': 0.0, 'b': True, 's': 'Weezer!', 'int_const': 5}), 'config16': ConfigData(data={'float_const': 0.4, 'x': 0, 'y': 0.0, 'b': True, 's': 'Weezer!', 'int_const': 5})}
    
    def reset(self):
        self.exp_info = ExperimentData(**{'trialExtraFile': 'Testing Data', 'description': 'Testing Data', 'file': 'experimentV3dpcllHWPrK1Kgbyzqb', 'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2', 'finished': False, 'estimatedTotalTimeMinutes': 0, 'dumbTextArea': 'dummy = dummy\na = 100', 'verbose': True, 'scatterIndVar': 'iparam', 'scatterDepVar': 'fparam', 'timeout': 18000, 'workers': 1, 'keepLogs': True, 'hyperparameters': {}, 'name': 'Testing Data', 'trialResult': 'Testing Data', 'totalExperimentRuns': 0, 'created': 1679705027850, 'scatter': True, 'expId': 'V3dpcllHWPrK1Kgbyzqb'})

    def assertConfigKeys(self, numConfigs, configs):
        for i in range(0, numConfigs):
            self.assertTrue(f'config{i}' in configs)

    def assertConfigSize(self, numItems, configs: Dict[str, ConfigData]):
        for key, config in configs.items():
            self.assertEqual(numItems, len(config.data))

    def test_single_int_variable(self):
        self.reset()
        self.exp_info.hyperparameters = self.single_int_param_hyperparams
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 5)
        self.assertConfigKeys(5, configs)
        self.assertConfigSize(len(self.single_int_param_hyperparams), configs)
        self.assertDictEqual(configs, self.single_int_param_expected_configs)

    def test_single_float_variable(self):
        self.reset()
        self.exp_info.hyperparameters = self.single_float_param_hyperparams
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 5)
        self.assertConfigKeys(5, configs)
        self.assertConfigSize(len(self.single_float_param_hyperparams), configs)
        self.assertDictEqual(configs, self.single_float_param_expected_configs)

    def test_single_bool_variable(self):
        self.reset()
        self.exp_info.hyperparameters = self.single_bool_param_hyperparams
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 2)
        self.assertConfigKeys(len(self.single_bool_param_hyperparams), configs)
        self.assertConfigSize(len(self.single_bool_param_hyperparams), configs)
        self.assertDictEqual(configs, self.single_bool_param_expected_configs)

    def test_single_int_const(self):
        self.reset()
        self.exp_info.hyperparameters = self.single_int_const_hyperparams
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 5)
        self.assertConfigKeys(5, configs)
        self.assertConfigSize(len(self.single_int_const_hyperparams), configs)
        self.assertDictEqual(configs, self.single_int_const_expected_configs)

    def test_single_float_const(self):
        self.reset()
        self.exp_info.hyperparameters = self.single_float_const_hyperparams
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 5)
        self.assertConfigKeys(5, configs)
        self.assertConfigSize(len(self.single_float_const_hyperparams), configs)
        self.assertDictEqual(configs, self.single_float_const_expected_configs)

    def test_single_string_const(self):
        self.reset()
        self.exp_info.hyperparameters = self.single_string_const_hyperparams
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 5)
        self.assertConfigKeys(5, configs)
        self.assertConfigSize(len(self.single_string_const_hyperparams), configs)
        self.assertDictEqual(configs, self.single_string_const_expected_configs)

    def test_one_of_everything(self):
        self.reset()
        self.exp_info.hyperparameters = self.one_of_everything
        generate_config_files(self.exp_info)
        configs = self.exp_info.configs
        self.assertEqual(len(configs), 17)
        self.assertConfigKeys(17, configs)
        self.assertConfigSize(len(self.one_of_everything), configs)
        self.assertDictEqual(configs, self.one_of_everything_expected_configs)


class TestGetDefault(unittest.TestCase):

    def test_get_int_default(self):
        result = get_default(int_param)
        self.assertEqual(result, 0)

    def test_get_float_default(self):
        result = get_default(float_param)
        self.assertEqual(result, 0.0)

    def test_get_bool_default(self):
        result = get_default(bool_param)
        self.assertTrue(result)

    def test_get_string_default(self):
        result = get_default(string_param)
        self.assertEqual(result, "Weezer!")


#Tests to write-- (generate_config_files)
#Error with default (returns None) Should we reraise the exception?
#Error making permutations ("Error while making permutations")
#Successful config generation
#Vary one variable and keep the rest (multiple) as constants/default
#Do we want to test the configFile writing?

#Tests to write-- (get_config_paramNames)
#Test for element being/not being in res

if __name__ == '__main__':
    unittest.main(verbosity=2)