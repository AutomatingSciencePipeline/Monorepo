import unittest

from modules.configs import gather_parameters
from modules.data.parameters import BoolParameter, IntegerParam, ParamType


class TestStringMethods(unittest.TestCase):

    test_empty_hyperparams_dict = {}  #Empty dictionary
    test_one_hyperparams_dict = {"x": IntegerParam(**{"default": 1, "min": 1, "max": 5, "step": 1, 'type': ParamType.INTEGER})}
    test_const_hyperparams_dict = {"x": IntegerParam(**{"default": 1, "min": 5, "max": 5, "step": 1, 'type': ParamType.INTEGER})}
    test_multiple_hyperparams_dict = {"x": IntegerParam(**{"default": 1, "min": 1, "max": 5, "step": 1, 'type': ParamType.INTEGER}), "y": IntegerParam(**{"default": 1, "min": 1, "max": 5, "step": 1, 'type': ParamType.INTEGER})}
    test_bool_hyperparams_dict = {"bool": BoolParameter(**{"type": ParamType.BOOL, "default": True})}
    test_empty_constants_dict = {}
    test_empty_parameters_dict = {}
    

    def reset(self):
        self.test_empty_hyperparams_dict = {}  #Empty dictionary
        self.test_empty_constants_dict = {}
        self.test_empty_parameters_dict = {}

    def test_gather_parameters_no_hyperparams(self):
        self.reset()
        gather_parameters(self.test_empty_hyperparams_dict, self.test_empty_constants_dict, self.test_empty_parameters_dict)
        self.assertFalse(self.test_empty_constants_dict)
        self.assertFalse(self.test_empty_parameters_dict)

    def test_gather_parameters_one_param(self):
        self.reset()
        gather_parameters(self.test_one_hyperparams_dict, self.test_empty_constants_dict, self.test_empty_parameters_dict)
        self.assertFalse(self.test_empty_constants_dict)
        self.assertEqual(len(self.test_empty_parameters_dict), 1)
        self.assertTrue("x" in self.test_empty_parameters_dict)
        self.assertEqual(self.test_empty_parameters_dict['x'],self.test_one_hyperparams_dict['x'])

    def test_gather_parameters_two_param(self):
        self.reset()
        gather_parameters(self.test_multiple_hyperparams_dict, self.test_empty_constants_dict, self.test_empty_parameters_dict)
        self.assertFalse(self.test_empty_constants_dict)
        self.assertEqual(len(self.test_empty_parameters_dict), 2)
        self.assertTrue("x" in self.test_empty_parameters_dict)
        self.assertTrue("y" in self.test_empty_parameters_dict)
        self.assertEqual(self.test_empty_parameters_dict['x'],self.test_multiple_hyperparams_dict['x'])
        self.assertEqual(self.test_empty_parameters_dict['y'],self.test_multiple_hyperparams_dict['y'])
    
    def test_gather_parameters_const_param(self):
        self.reset()
        gather_parameters(self.test_const_hyperparams_dict, self.test_empty_constants_dict, self.test_empty_parameters_dict)
        self.assertTrue(self.test_empty_constants_dict)
        print(self.test_empty_constants_dict)
        self.assertEqual(len(self.test_empty_parameters_dict), 0)
        self.assertTrue("x" in self.test_empty_constants_dict)
        self.assertTrue(self.test_empty_constants_dict['x'],5) #TODO: Change this to use a constant


#Tests to write-- (gather_parameters)
#Happy case for min == max for integer float
#Happy case for string having default

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
