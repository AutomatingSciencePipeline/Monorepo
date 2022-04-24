from ast import Assert
import pytest
import unittest
import app 
import json
# def test_gen_configs(self):
#     sample_json =  { [{ paramName: 'x', values: [1,0,4,1], type: 'integer' }, { paramName: 'y', value: [6,5,9,1], type: 'integer' }, { paramName: 'add', value: true, type: 'boolean' }] }
#     result = app.gen_configs(sample_json)
#     print(result)
#     assertTrue(result, "")


class Test_TestAppBackend(unittest.TestCase):
    def test_gen_config(self):
        sample_json =  { [{ paramName: 'x', values: [1,0,4,1], type: 'integer' }, { paramName: 'y', value: [6,5,9,1], type: 'integer' }, { paramName: 'add', value: true, type: 'boolean' }] }
        result = app.gen_configs(sample_json)
        print(result)
        self.assertTrue(result, "")

    def test_gen_config_array(self):
        sample_json =  { [{ paramName: 'x', values: [1,0,4,1], type: 'integer' }, { paramName: 'y', value: [6,5,9,1], type: 'integer' }, { paramName: 'add', value: true, type: 'boolean' }] }
        result = app.gen_configs(sample_json)
        self.assertTrue(result, "")

    def test_gen_config_add(self):
        sample_json =  { [{ paramName: 'x', values: [1,0,4,1], type: 'integer' }, { paramName: 'y', value: [6,5,9,1], type: 'integer' }, { paramName: 'add', value: true, type: 'boolean' }] }
        result = app.gen_configs(sample_json)
        print(result)
        self.assertTrue(result, "")

if __name__ == '__main__':
    unittest.main()