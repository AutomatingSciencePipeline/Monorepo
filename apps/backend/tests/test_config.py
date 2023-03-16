import unittest

from modules.configs import gather_parameters

test_empty_hyperparams_dict_list = []  #Empty dictionary
test_one_hyperparams_dict_list = [{"name": "x", "default": "1", "min": "1", "max": "5", "step": "1", "type": "integer"}]
test_empty_dict_list = {}
test_empty_list = []


def test_gather_parameters_no_params():
    #Do we want to handle checking for not having any hyperparams in the array
    gather_parameters(test_empty_hyperparams_dict_list, test_empty_dict_list, test_empty_list)


def test_gather_parameters_one_param():
    gather_parameters(test_one_hyperparams_dict_list, test_empty_dict_list, test_empty_list)


#Tests to write-- (gather_parameters)
#Missing type (throws exception)
#Missing name (throws exception)
#Missing min and max for integer and floats (throws exception)
#Missing default for string (throws exception)
#Else case check parameters to see if hyperparameter is there
#Happy case for min == max for integer float
#Happy case for min != max for integer float
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
    unittest.main()
