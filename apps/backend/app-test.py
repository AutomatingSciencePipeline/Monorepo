from ast import Assert
import pytest
import unittest
import app 
import json

class Test_TestAppBackend(unittest.TestCase):
    def test_gen_config(self):
        sample_json =  { [{ 'paramName': 'x', 'values': [1,0,4,1], type: 'integer' }, { 'paramName': 'y', 'value': [6,5,9,1], type: 'integer' }, { 'paramName': 'add', 'value': 'true' , type: 'boolean' }] }
        result = app.gen_configs(sample_json)
        print(result)
        self.assertTrue(result, "")

    def test_gen_config_array(self):
        sample_json =  { [{ 'paramName': 'x', 'values': [1,0,4,1], type: 'integer' }, { 'paramName': 'y', 'value': [6,5,9,1], type: 'integer' }, {"paramName": 'add', 'value' : 'true', type: 'boolean' }] }
        result = app.gen_configs(sample_json)
        self.assertTrue(result, "")
     #I have to figure out the input 
    def test_gen_config_add(self):
        sample_json =  { [{ 'paramName': 'x', 'values': [1,0,4,1], type: 'integer' }, {'paramName': 'y', 'value': [6,5,9,1], type: 'integer' }, { "paramName": 'add', 'value': 'true' , type: 'boolean' }] }
        result = app.gen_configs(sample_json)
        print(result)
        self.assertTrue(result, "")
     #I have to figure out the input 
    def test_post(self):
        array = [1, 2, 3]
        result = app.post(array)
        self.assertTrue(result, "")
         #I have to figure out the input 
    def test_proc_message_empty(self):
        input = ""
        result = app.proc_msg(input)
        self.assertTrue(result, "")
    #I have to figure out the input 
    def test_proc_message_simpleInput(self): 
        input = "abcde"
        result = app.proc_message(input)
        self.assertTrue(result, "")

    def test_communicate_simple_proces(self): 
        process = 1, 2, 3, 4 #need to fix the inputs
        payload = 1, 2, 3, 4
        result = app.communicate(process, payload)
        self.assertTrue(result, "")

    def test_communicate_complicated_proces(self): 
        process = 1, 2, 3, 4 #need to fix the inputs
        payload = 1, 2, 3, 4
        result = app.communicate(process, payload)
        self.assertTrue(result, "")
    
    def test_np_uncode_invalidinput(self): #need to make sure it throws on error
        x = "blah"
        result = app.np_uncode(x)
        self.assertTrue(result, "")
    
    def test_np_uncode_integer(self): #need to make sure it an integer
        x = "blah"
        result = app.np_uncode(x)
        self.assertTrue(result, "")

    def test_np_uncode_float(self): #need to make sure it is an float 
        x = "blah"
        result = app.np_uncode(x)
        self.assertTrue(result, "")
    def test_write_config_simple(self): 
        raw = ""
        headers = ""
        dicts = ""
        jsons = ""
        #figure out how to check the file input and expected
    def test_write_config_complex(self): 
        raw = ""
        headers = ""
        dicts = ""
        jsons = ""
        #figure out how to check the file input and expected
    def test_mapper_invalid_input(self):
        params = ""
        app.mapper(params)
        #figure out how to catch an error and make sure it is correct 
    def test_mapper_invalid_simple(self):
        params = ""
        app.mapper(params)
        #figure out how to catch an error and make sure it is correct 
    def test_mapper_invalid_complex(self):
        params = ""
        app.mapper(params)
        #figure out how to catch an error and make sure it is correct 
if __name__ == '__main__':
    unittest.main()