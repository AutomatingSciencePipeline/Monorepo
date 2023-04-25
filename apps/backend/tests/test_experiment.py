import unittest
from app import parseParams

from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import BoolParameter, FloatParam, IntegerParam, ParamType, StringParameter

class TestExperimentData(unittest.TestCase):
    params = parseParams([{"name":"iparam","default":"1","min":"1","max":"10","step":"1","type":"integer"},{"name":"fparam","default":"1.0","min":"1.0","max":"10.0","step":"1.0","type":"float"},{"name":"sparam","default":"Hi","type":"string"},{"name":"bparam","default":True,"type":"bool"}])
    optional = ["trialExtraFile", "scatterIndVar", "scatterDepVar", "startedAtEpochMillis", "finishedAtEpochMillis", "finished", "passes", "fails"]
    fieldsWithDefault = {"file": "","postProcess": False,"configs": {},"totalExperimentRuns": 0, "experimentType":ExperimentType.UNKNOWN}
    expInfo = {'trialExtraFile': 'Testing Data',
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
    
    
    def testNormal(self):
        experiment = ExperimentData(**self.expInfo)
        expDict = experiment.dict().copy()
        for key, value in expDict.items():
            if key in self.optional:
                if key in self.expInfo:
                    self.assertEqual(value,self.expInfo[key])
                else:
                    self.assertIsNone(value)
            elif key in self.fieldsWithDefault:
                if key in self.expInfo:
                    self.assertEqual(value, self.expInfo[key])
                else:
                    self.assertEqual(value,self.fieldsWithDefault[key])
            else:
                self.assertEqual(value,self.expInfo[key])
        
        
        
if __name__ == '__main__':
    unittest.main(verbosity=2)