import pytest
import app
import unittest
import flask 
import numpy as np
import collections
import itertools
from collections.abc import Iterable #hi
class TestBackend(unittest.TestCase):
    def test_gen_config(self):
        sample_json = [{'paramName': 'x', 'values': [1, 0, 4, 1], 'type': 'integer'}, {'paramName': 'y', 'values': [
            6, 5, 9, 1], 'type': 'integer'}, {'paramName': 'add', 'value': 'true', 'type': 'boolean'}]
        result = list(app.gen_configs(sample_json))
        expected =  [(0, (0, 6)), (1, (1, 6)), (2, (2, 6)), (3, (3, 6)), (4, (4, 6)), (5, (1, 5)), (6, (1, 6)), (7, (1, 7)), (8, (1, 8)), (9, (1, 9))]#[(0, (0, 6, True)), (1, (1, 6, True)), (2, (2, 6, True)), (3, (3, 6, True)), (4, (4, 6, True)), (5, (1, 5, True)), (6, (1, 6, True)), (7, (1, 7, True)), (8, (1, 8, True)), (9, (1, 9, True))]
        print(result)
        self.assertEqual(result, expected)
       
    def test_gen_config_array(self):
        sample_json = {'paramName': 'x', 'values': [1, 0, 1, 1], 'type': 'integer'}, {'paramName': 'y', 'values': [6, 5, 6, 1], 'type': 'integer'}, {'paramName': 'add', 'value': 'true', 'type': 'boolean'}
        result = list(app.gen_configs(sample_json))
        expected = [(0, (0, 6)), (1, (1, 6)), (2, (1, 5)), (3, (1, 6))]
        print(result)
        self.assertEqual(result, expected)
        
    def test_concat_array_empty(self):
        array = []
        array2 = [1, 2, 3]
        array= app.concat_arrays(array, array2)
        expected =[1, 2, 3]
        print(array)
        self.assertEqual(array2,expected)
    def test_concat_array_length_simple(self):
       array = [3]
       array2 = [1]
       array2 = app.concat_arrays(array, array2)
       expected = [3, 1]
       print(array)
       self.assertEqual(array,expected)
    def test_concat_array_length_complex(self):
       array = [3, 4, 6]
       array2 = [1, 2, 3]
       array2 = app.concat_arrays(array, array2)
       expected =[3, 4, 6, 1, 2, 3]
       print(array)
       self.assertEqual(array,expected)
    def test_np_uncode_invalidinput(self):
        x = "blah"
        result = app.np_uncode(x)
        expected = None
        print(result)
        self.assertEqual(result,expected)
    # def test_flatten_invalid(self):  # need to make sure it is an float
    #     x = "blah"
    #     result = app.np_uncode(x)
    #     expected = 1
    #     print(result)
    #     self.assertEqual(result,expected)
    # def test_np_uncode_integer(self):  # need to make sure it an integer
    #     x = 1
    #     result = app.np_uncode(x)
    #     expected = 1
    #     print(result)
    #     self.assertEqual(result,expected)
    # def test_np_uncode_float(self):  # need to make sure it is an float
    #     x = 1.
    #     result = app.np_uncode(x)
    #     expected = 1
    #     print(result)
    #     self.assertEqual(result,expected)
    # def test_flatten_simple(self):
    #     nums = [1, 2, 3, 4, [6, 7, 8], 9, 10]
    #     my_iterator = iter(nums)
    #     result = app.flatten(my_iterator)
    #     expected = [1, 2, 3, 4, 6, 7, 8, 9, 10]
    #     print(result)
    #     self.assertEqual(result,expected)
    # def test_flatten_simple_one(self):
    #     x = [1]
    #     result = app.flatten(x)
    #     expected = 1
    #     print(result)
    #     self.assertEqual(result,expected)
#i love to eat people 
    if __name__ == '__main__':
        unittest.main()