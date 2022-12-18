import pytest
from app import gen_configs
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

    if __name__ == '__main__':
        unittest.main()