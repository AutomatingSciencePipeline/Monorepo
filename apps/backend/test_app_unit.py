import pytest
import app
import unittest
import flask 
import numpy as np
class TestBackend(unittest.TestCase):
    def test_gen_config(self):
        sample_json = [{'paramName': 'x', 'values': [1, 0, 4, 1], 'type': 'integer'}, {'paramName': 'y', 'values': [
            6, 5, 9, 1], 'type': 'integer'}, {'paramName': 'add', 'value': 'true', 'type': 'boolean'}]
        result = list(app.gen_configs(sample_json))
        expected = [(0, (0, 6, True)), (1, (1, 6, True)), (2, (2, 6, True)), (3, (3, 6, True)), (4, (4, 6, True)), (5, (1, 5, True)), (6, (1, 6, True)), (7, (1, 7, True)), (8, (1, 8, True)), (9, (1, 9, True))]
        print(result)
        self.assertEqual(result, expected)
       
    def test_gen_config_array(self):
        sample_json = {'paramName': 'x', 'values': [1, 0, 1, 1], 'type': 'integer'}, {'paramName': 'y', 'values': [
            6, 5, 6, 1], 'type': 'integer'}, {'paramName': 'add', 'value': 'true', 'type': 'boolean'}
        result = list(app.gen_configs(sample_json))
        expected = [(0, (0, 6, True)), (1, (1, 6, True)), (2, (1, 5, True)), (3, (1, 6, True))]
        print(result)
        self.assertEqual(result, expected)
        
    # def test_gen_config_add(self):
    #     sample_json = [{'paramName': 'x', 'values': [1, 0, 4, 1], type: 'integer'}, {'paramName': 'y', 'value': [
    #             6, 5], type: 'integer'}, {"paramName": 'add', 'value': 'true', type: 'boolean'}]
    #     result = app.gen_configs(sample_json)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     self.assertEqual(result, expected)
        # if (result == expected):
        #     assert True
        # else:
        #     assert False
    # def test_concat_array_empty(self):
    #     array = ""
    #     result = app.concat_arrays(array)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_concat_array_length_two(self):
    #     array = ""
    #     result = app.concat_arrays(array)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_np_uncode_invalidinput( self):
    #     x = "blah"
    #     result = app.np_uncode(x)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_np_uncode_integer(self):  # need to make sure it an integer
    #     x = "blah"
    #     result = app.np_uncode(x)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_np_uncode_float(self):  # need to make sure it is an float
    #     x = "blah"
    #     result = app.np_uncode(x)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_flatten_invalid(self):
    #     x = "bob"
    #     result = app.flatten(x)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_flatten_siimple(self):
    #     x = "bob"
    #     result = app.flatten(x)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False
    # def test_flatten_complex(self):
    #     x = "bob"
    #     result = app.flatten(x)
    #     expected = "((0,6),(1,6),(1,5),(1,6))"
    #     print(result)
    #     if (result == expected):
    #         assert True
    #     else:
    #         assert False

    if __name__ == '__main__':
        unittest.main()