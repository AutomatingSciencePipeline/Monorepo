from ast import Assert
import pytest
import unittest
import app

# def test_gen_configs(self):
#     sample_json =  { [{ paramName: 'x', values: [1,0,4,1], type: 'integer' }, { paramName: 'y', value: [6,5,9,1], type: 'integer' }, { paramName: 'add', value: true, type: 'boolean' }] }
#     result = app.gen_configs(sample_json)
#     print(result)
#     assertTrue(result, "")


sample_json =  { [{ paramName: 'x', values: [1,0,4,1], type: 'integer' }, { paramName: 'y', value: [6,5,9,1], type: 'integer' }, { paramName: 'add', value: true, type: 'boolean' }] }
result = app.gen_configs(sample_json)
print(result)

if __name__ == '__main__':
    unittest.main()