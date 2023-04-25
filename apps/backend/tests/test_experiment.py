import unittest
from app import parseParams

from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import BoolParameter, FloatParam, IntegerParam, ParamType, StringParameter

class TestExperimentData(unittest.TestCase):
    params = parseParams([{"name":"iparam","default":"1","min":"1","max":"10","step":"1","type":"integer"},{"name":"fparam","default":"1.0","min":"1.0","max":"10.0","step":"1.0","type":"float"},{"name":"sparam","default":"Hi","type":"string"},{"name":"bparam","default":True,"type":"bool"}])
    optional = ["trialExtraFile", "scatterIndVar", "scatterDepVar", "startedAtEpochMillis", "finishedAtEpochMillis", "finished", "passes", "fails"]
    fields_with_default = {"file": "","postProcess": False,"configs": {},"totalExperimentRuns": 0, "experimentType":ExperimentType.UNKNOWN}
    exp_info = {'trialExtraFile': 'Testing Data',
            'description': 'Testing Data', 
            'file': 'experimentV3dpcllHWPrK1Kgbyzqb', 
            'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2', 
            'finished': False, 
            'estimatedTotalTimeMinutes': 0, 
            'dumbTextArea': 'dummy = dummy\na = 100', 
            'verbose': True, 
            'scatterIndVar': 'iparam', 
            'scatterDepVar': 'fparam',
            'timeout': 18000, 'workers': 1, 
            'keepLogs': True, 
            'hyperparameters': params,
            'name': 'Testing Data', 
            'trialResult': 'Testing Data', 
            'totalExperimentRuns': 0, 
            'created': 1679705027850, 
            'scatter': True, 
            'expId': 'V3dpcllHWPrK1Kgbyzqb'}
    
    
    def test_creating_object_does_not_mutate_input_fields(self):
        experiment = ExperimentData(**self.exp_info)
        expDict = experiment.dict().copy()
        for key, value in expDict.items():
            if key in self.optional:
                if key in self.exp_info:
                    self.assertEqual(value,self.exp_info[key])
                else:
                    self.assertIsNone(value)
            elif key in self.fields_with_default:
                if key in self.exp_info:
                    self.assertEqual(value, self.exp_info[key])
                else:
                    self.assertEqual(value,self.fields_with_default[key])
            else:
                self.assertEqual(value,self.exp_info[key])
        
        
        
if __name__ == '__main__':
    unittest.main(verbosity=2)