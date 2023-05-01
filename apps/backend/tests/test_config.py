import unittest

from modules.configs import gather_parameters
from modules.data.parameters import BoolParameter, FloatParam, IntegerParam, ParamType, StringParameter


class TestGatherParameters(unittest.TestCase):
    intDefault, intStart, intStop, intStep, intStepInvalid, intConst = 0, 0, 5, 1, 0, 5
    int_param_dict = {"default": intDefault, "min": intStart, "max": intStop, "step": intStep, "type": ParamType.INTEGER}
    int_param_const_dict = {"default": intDefault, "min": intConst, "max": intConst, "step": intStep, "type": ParamType.INTEGER}
    int_param = IntegerParam(**int_param_dict)
    int_const_param = IntegerParam(**int_param_const_dict)

    floatDefault, floatStart, floatStop, floatStep, invalidFloatStep, floatConst = 0.0, 0.1, 1, 0.5, 0, 0.5
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
        gather_parameters(self.single_int_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertEqual(len(self.param_result_dict), 1)
        self.assertTrue("x" in self.param_result_dict)
        self.assertEqual(self.param_result_dict['x'], self.single_int_param_dict['x'])

    def test_gather_parameters_const_int_param(self):
        self.reset()
        gather_parameters(self.single_int_const_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 1)
        self.assertEqual(len(self.param_result_dict), 0)
        self.assertTrue("x" in self.const_result_dict)
        self.assertTrue(self.const_result_dict['x'], self.intConst)

    def test_gather_parameters_one_float_param(self):
        self.reset()
        gather_parameters(self.single_float_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertEqual(len(self.param_result_dict), 1)
        self.assertTrue("x" in self.param_result_dict)
        self.assertEqual(self.param_result_dict['x'], self.single_float_param_dict['x'])

    def test_gather_parameters_const_float_param(self):
        self.reset()
        gather_parameters(self.single_float_const_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 1)
        self.assertEqual(len(self.param_result_dict), 0)
        self.assertTrue("x" in self.const_result_dict)
        self.assertTrue(self.const_result_dict['x'], self.floatConst)

    def test_gather_parameters_bool_param(self):
        self.reset()
        gather_parameters(self.single_bool_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertFalse(self.const_result_dict)
        self.assertEqual(len(self.param_result_dict), 1)
        self.assertTrue("b" in self.param_result_dict)
        self.assertTrue(self.param_result_dict['b'], self.single_bool_param_dict['b'])

    def test_gather_parameters_string_param(self):
        self.reset()
        gather_parameters(self.single_string_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 1)
        self.assertEqual(len(self.param_result_dict), 0)
        self.assertTrue("s" in self.const_result_dict)
        self.assertTrue(self.const_result_dict['s'], self.bool_param.default)

    def test_gather_parameters_two_param(self):
        self.reset()
        gather_parameters(self.mixed_param_dict, self.const_result_dict, self.param_result_dict)
        self.assertEqual(len(self.const_result_dict), 3)
        self.assertEqual(len(self.param_result_dict), 3)
        self.assertTrue('x' in self.param_result_dict)
        self.assertTrue('y' in self.param_result_dict)
        self.assertTrue('b' in self.param_result_dict)
        self.assertTrue('intconst' in self.const_result_dict)
        self.assertTrue('floatconst' in self.const_result_dict)
        self.assertTrue('s' in self.const_result_dict)
        self.assertEqual(self.param_result_dict['x'], self.mixed_param_dict['x'])
        self.assertEqual(self.param_result_dict['y'], self.mixed_param_dict['y'])
        self.assertEqual(self.param_result_dict['b'], self.mixed_param_dict['b'])
        self.assertEqual(self.const_result_dict['intconst'], self.intConst)
        self.assertEqual(self.const_result_dict['floatconst'], self.floatConst)
        self.assertEqual(self.const_result_dict['s'], self.string_param.default)


#Tests to wite-- (generate_list)
#Integer test empty step value (DEFAULT_STEP_INT)
#Integer test step == 0 (DEFAULT_STEP_INT) Make 0 a constant value in gather_parameters
#Integer test not empty and not 0 (uses otherVar['step'])
#Integer test make sure correct number of items given min and max
#Same thing for floats as above
#String test parampos should contain the default value
#Bool test parampos should contain True and False

#Tests to write-- (generate_config_files)
#Error with default (returns None) Should we reraise the exception?
#Error making permutations ("Error while making permutations")
#Successful config generation
#Do we want to test the configFile writing?

#Tests to write-- (get_config_paramNames)
#Test for element being/not being in res

if __name__ == '__main__':
    unittest.main(verbosity=2)
