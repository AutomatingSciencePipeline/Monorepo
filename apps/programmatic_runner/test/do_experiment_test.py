from core.experiment import Experiment
import pytest

@pytest.fixture
def exp():
    # Setup
    exp = Experiment({})
    yield exp
    # Teardown

'''
TODO: BVA conds
    1. Typical use -> nothing happens
    2. Error during first run -> Log
        - Hyperaram declare inappropriately
        - User's code throws errors
    3. Error during run -> Log
        - Hyperaram declare inappropriately
        - User's code throws errors

'''
def test_01_simple(exp):
    hyperparam = {
        'x' : (0, 1 , 3)
    }