import unittest
from modules.data.parameters import parseRawHyperparameterData
from modules.data.configData import ConfigData

from modules.data.experiment import ExperimentData, ExperimentType


class TestExperimentData(unittest.TestCase):
    params = parseRawHyperparameterData([{"name": "iparam", "default": "1", "min": "1", "max": "10", "step": "1", "type": "integer"}, {"name": "fparam", "default": "1.0", "min": "1.0", "max": "10.0", "step": "1.0", "type": "float"}, {"name": "sparam", "default": "Hi", "type": "string"}, {"name": "bparam", "default": True, "type": "bool"}])
    configs = {"config0": ConfigData(**{"data":{"key":"value"}})}
    optional = ["trialExtraFile", "scatterIndVar", "scatterDepVar", "startedAtEpochMillis", "finishedAtEpochMillis"]
    fields_with_default = {"file": "", "postProcess": False, "configs": {}, "totalExperimentRuns": 0, "experimentType": ExperimentType.UNKNOWN, "finished": False,"passes":0, "fails":0}


    exp_info = {'configs':configs,'trialExtraFile': 'Testing Data', 'description': 'Testing Data', 'file': 'experimentV3dpcllHWPrK1Kgbyzqb', 'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2', 'finished': False, 'estimatedTotalTimeMinutes': 0, 'dumbTextArea': 'dummy = dummy\na = 100', 'scatterIndVar': 'iparam', 'scatterDepVar': 'fparam', 'timeout': 5, 'workers': 1, 'hyperparameters': params, 'name': 'Testing Data', 'trialResult': 'Testing Data', 'totalExperimentRuns': 0, 'created': 1679705027850, 'scatter': True, 'expId': 'V3dpcllHWPrK1Kgbyzqb'}

    exp_info_has_all_optional = {'trialExtraFile': 'Testing Data', 'description': 'Testing Data', 'file': 'experimentV3dpcllHWPrK1Kgbyzqb', 'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2', 'finished': False, 'estimatedTotalTimeMinutes': 0, 'dumbTextArea': 'dummy = dummy\na = 100', 'scatterIndVar': 'iparam', 'scatterDepVar': 'fparam', "startedAtEpochMillis": 0, "finishedAtEpochMillis": 0, 'timeout': 5, 'workers': 1, 'hyperparameters': params, 'name': 'Testing Data', 'trialResult': 'Testing Data', 'totalExperimentRuns': 0, 'created': 1679705027850, 'scatter': True, 'expId': 'V3dpcllHWPrK1Kgbyzqb'}

    exp_info_has_all_default = {'trialExtraFile': 'Testing Data', 'description': 'Testing Data', 'file': 'experimentV3dpcllHWPrK1Kgbyzqb', 'creator': 'U0EmxpfuqWM2fSa1LKmpFiqLj0V2', 'finished': False, "experimentType": ExperimentType.PYTHON, 'estimatedTotalTimeMinutes': 0, 'dumbTextArea': 'dummy = dummy\na = 100', 'scatterIndVar': 'iparam', 'scatterDepVar': 'fparam', 'timeout': 5, 'workers': 1, "configs": {}, 'hyperparameters': params, 'name': 'Testing Data', 'trialResult': 'Testing Data', 'totalExperimentRuns': 0, "passes": 0, "fails": 0, 'created': 1679705027850, 'scatter': True, "postProcess": True, 'expId': 'V3dpcllHWPrK1Kgbyzqb'}

    def test_creating_object_does_not_mutate_input_fields(self):
        experiment = ExperimentData(**self.exp_info)
        expDict = experiment.dict().copy()
        for key, value in expDict.items():
            if key in self.optional:
                if key in self.exp_info:
                    self.assertEqual(value, self.exp_info[key])
                else:
                    self.assertIsNone(value)
            elif key in self.fields_with_default:
                if key in self.exp_info:
                    self.assertEqual(value, self.exp_info[key])
                else:
                    self.assertEqual(value, self.fields_with_default[key])
            else:
                self.assertEqual(value, self.exp_info[key])

    def test_remove_optional_does_not_error(self):
        for field in self.optional:
            cloned_info = self.exp_info_has_all_optional.copy()
            del cloned_info[field]
            experiment = ExperimentData(**cloned_info)
            self.assertIsInstance(experiment, ExperimentData)
            self.assertEqual(experiment.dict()[field], None)

    def test_remove_default_does_not_error(self):
        for field, value in self.fields_with_default.items():
            cloned_info = self.exp_info_has_all_default.copy()
            del cloned_info[field]
            experiment = ExperimentData(**cloned_info)
            self.assertIsInstance(experiment, ExperimentData)
            self.assertEqual(experiment.dict()[field], value)

    def test_check_trialResult(self):
        cloned_info = self.exp_info.copy()
        del cloned_info['trialResult']
        with self.assertRaises(ValueError):
            ExperimentData(**cloned_info)

    def test_check_hyperparams(self):
        cloned_info = self.exp_info.copy()
        invalid_hyperparameters_dict = {"field": "value"}
        cloned_info['hyperparameters'] = invalid_hyperparameters_dict
        with self.assertRaises(ValueError):
            ExperimentData(**cloned_info)

    def test_check_configs(self):
        cloned_info = self.exp_info.copy()
        invalid_configs_dict = {"field": "value"}
        cloned_info['configs'] = invalid_configs_dict
        with self.assertRaises(ValueError):
            ExperimentData(**cloned_info)
            
        cloned_info = self.exp_info.copy()
        invalid_configs_dict = {1: "value"}
        cloned_info['configs'] = invalid_configs_dict
        with self.assertRaises(ValueError):
            ExperimentData(**cloned_info)


if __name__ == '__main__':
    unittest.main(verbosity=2)