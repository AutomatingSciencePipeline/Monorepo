import unittest

from modules.data.parameters import BoolParameter, FloatParam, IntegerParam, ParamType, StringParameter

class TestIntParameter(unittest.TestCase):
    intDefault, intStart, intStop, intStep, intStepInvalid = 0, 0, 10, 1, 0

    int_param_dict = {"default": intDefault, "min": intStart, "max": intStop, "step": intStep, "type": ParamType.INTEGER}
    int_param_dict_min_equal_max = {"default": intDefault, "min": intStart, "max": intStart, "step": intStep, "type": ParamType.INTEGER}
    int_param_dict_no_default = {"min": intStart, "max": intStop, "step": intStep, "type": ParamType.INTEGER}
    int_param_dict_no_min = {"default": intDefault, "max": intStop, "step": intStep, "type": ParamType.INTEGER}
    int_param_dict_no_max = {"default": intDefault, "min": intStart, "step": intStep, "type": ParamType.INTEGER}
    int_param_dict_no_step = {"default": intDefault, "min": intStart, "max": intStop, "type": ParamType.INTEGER}

    int_param_dict_min_greater_than_max = {"default": intDefault, "min": intStop, "max": intStart, "step": intStep, "type": ParamType.INTEGER}
    int_param_dict_invalid_step = {"default": intDefault, "min": intStart, "max": intStop, "step": intStepInvalid, "type": ParamType.INTEGER}

    def test_normal(self):
        intParam = IntegerParam(**self.int_param_dict)
        self.assertEqual(intParam.default, self.intDefault)
        self.assertEqual(intParam.min, self.intStart)
        self.assertEqual(intParam.max, self.intStop)
        self.assertEqual(intParam.step, self.intStep)

    def test_int_equal_max(self):
        intParam = IntegerParam(**self.int_param_dict_min_equal_max)
        self.assertEqual(intParam.default, self.intDefault)
        self.assertEqual(intParam.min, self.intStart)
        self.assertEqual(intParam.max, self.intStart)
        self.assertEqual(intParam.step, self.intStep)

    def test_no_default(self):
        with self.assertRaises(ValueError):
            IntegerParam(**self.int_param_dict_no_default)

    def test_no_min(self):
        with self.assertRaises(ValueError):
            IntegerParam(**self.int_param_dict_no_min)

    def test_no_max(self):
        with self.assertRaises(ValueError):
            IntegerParam(**self.int_param_dict_no_max)

    def test_no_step(self):
        with self.assertRaises(ValueError):
            IntegerParam(**self.int_param_dict_no_step)

    def test_min_greater_than_max(self):
        with self.assertRaises(ValueError):
            IntegerParam(**self.int_param_dict_min_greater_than_max)

    def test_invalid_step(self):
        with self.assertRaises(ValueError):
            IntegerParam(**self.int_param_dict_invalid_step)


class TestFloatParameter(unittest.TestCase):
    floatDefault, floatStart, floatStop, floatStep, invalidFloatStep = 0.0, 0.1, 1, 0.1, 0

    float_param_dict = {"default": floatDefault, "min": floatStart, "max": floatStop, "step": floatStep, "type": ParamType.FLOAT}
    float_param_dict_min_equal_max = {"default": floatDefault, "min": floatStart, "max": floatStart, "step": floatStep, "type": ParamType.FLOAT}
    float_param_dict_no_default = {"min": floatStart, "max": floatStop, "step": floatStep, "type": ParamType.FLOAT}
    float_param_dict_no_min = {"default": floatDefault, "max": floatStop, "step": floatStep, "type": ParamType.FLOAT}
    float_param_dict_no_max = {"default": floatDefault, "min": floatStart, "step": floatStep, "type": ParamType.FLOAT}
    float_param_dict_no_step = {"default": floatDefault, "min": floatStart, "max": floatStop, "type": ParamType.FLOAT}
    float_param_dict_min_greater_max = {"default": floatDefault, "min": floatStop, "max": floatStart, "step": invalidFloatStep, "type": ParamType.FLOAT}
    float_param_dict_invalid_step = {"default": floatDefault, "min": floatStart, "max": floatStop, "step": invalidFloatStep, "type": ParamType.FLOAT}

    def test_creating_object_does_not_mutate_input_fields(self):
        floatParam = FloatParam(**self.float_param_dict)
        self.assertEqual(floatParam.default, self.floatDefault)
        self.assertEqual(floatParam.min, self.floatStart)
        self.assertEqual(floatParam.max, self.floatStop)
        self.assertEqual(floatParam.step, self.floatStep)

    def test_min_equal_max(self):
        floatParam = FloatParam(**self.float_param_dict_min_equal_max)
        self.assertEqual(floatParam.default, self.floatDefault)
        self.assertEqual(floatParam.min, self.floatStart)
        self.assertEqual(floatParam.max, self.floatStart)
        self.assertEqual(floatParam.step, self.floatStep)

    def test_no_default(self):
        with self.assertRaises(ValueError):
            FloatParam(**self.float_param_dict_no_default)

    def test_no_min(self):
        with self.assertRaises(ValueError):
            FloatParam(**self.float_param_dict_no_min)

    def test_no_max(self):
        with self.assertRaises(ValueError):
            FloatParam(**self.float_param_dict_no_max)

    def test_no_step(self):
        with self.assertRaises(ValueError):
            FloatParam(**self.float_param_dict_no_step)

    def test_min_greater_max(self):
        with self.assertRaises(ValueError):
            FloatParam(**self.float_param_dict_min_greater_max)

    def test_invalid_step(self):
        with self.assertRaises(ValueError):
            FloatParam(**self.float_param_dict_invalid_step)


class TestBoolParameter(unittest.TestCase):
    bool_dict_true = {'default': True, 'type': ParamType.BOOL}
    bool_dict_false = {'default': False, 'type': ParamType.BOOL}
    bool_dict_no_default = {'type': ParamType.BOOL}

    def test_true_input(self):
        boolParam = BoolParameter(**self.bool_dict_true)
        self.assertTrue(boolParam.default)

    def test_false_input(self):
        boolParam = BoolParameter(**self.bool_dict_false)
        self.assertFalse(boolParam.default)

class TestStringParameter(unittest.TestCase):
    testString = "Hello World"
    string_dict = {'default': testString, 'type': ParamType.STRING}
    string_dict_no_default = {'type': ParamType.STRING}

    def test_true_input(self):
        strParam = StringParameter(**self.string_dict)
        self.assertEqual(strParam.default, self.testString)


if __name__ == '__main__':
    unittest.main(verbosity=2)