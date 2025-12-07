from core.experiment import Experiment
import pytest

@pytest.fixture
def exp():
    # Setup
    exp = Experiment({})
    yield exp
    # Teardown

def make_simple_assert(var, r, expected, exp):
    hyperparams = {var : r}
    assert expected == [i for i in exp.prepData(hyperparams)]

def test_01_simple(exp):
    expected = [{"x" : i} for i in range(11)]
    make_simple_assert("x", (0,10,1), expected, exp)

def test_02_simpleInterval(exp):
    expected = [{"x" : i} for i in range(0,11,2)] 
    make_simple_assert("x", (0,10,2), expected, exp)

def test_03_simpleNames(exp):
    expected = [{"y" : i} for i in range(0,11,2)] 
    make_simple_assert("y", (0,10,2), expected, exp)

    expected = [{"z" : i} for i in range(0,11,2)] 
    make_simple_assert("z", (0,10,2), expected, exp)

def test_03A_wrongInputs(exp):
    with pytest.raises(ValueError, match=r"Variable names must be string, but given:.*"):
        make_simple_assert(5, (0,10,2), [], exp)
    
    with pytest.raises(ValueError, match=r"Input type not supported:.*"):
        make_simple_assert("x", (0,10,2,4), [], exp)
    
    with pytest.raises(ValueError, match=r"Illegal range:.*"):
        make_simple_assert("x", (0,"a",2), [], exp)

    with pytest.raises(ValueError, match=r"Input type not supported:.*"):
        make_simple_assert("x", (0,"a","x",4), [], exp)
    

def test_04_simpleFloats(exp):
    expected = [{"floats" : (0.5 + (i * 0.1))} for i in range (1, 6)]
    make_simple_assert("floats", (0.6, 1.0, 0.1), expected, exp)

    vals = [0, 1e-11, 2e-11, 3e-11]
    expected = [{"pos-floats" : i} for i in vals]
    make_simple_assert("pos-floats", (0, 3e-11, 1e-11), expected, exp)

    vals = [-1e-11, 0, 1e-11]
    expected = [{"neg-pos-floats" : i} for i in vals]
    make_simple_assert("neg-pos-floats", (-1e-11, 1e-11, 1e-11), expected, exp)

    vals = [-1e-11]
    expected = [{"one-floats" : i} for i in vals]
    make_simple_assert("one-floats", (-1e-11, -1e-11, 0), expected, exp)

    vals = [-1e-11]
    expected = [{"one-floats" : i} for i in vals]
    make_simple_assert("one-floats", (-1e-11, -1e-11, 5), expected, exp)\
        
    vals = [-1e-11]
    expected = [{"one-floats" : i} for i in vals]
    make_simple_assert("one-floats", (-1e-11, -1e-11, 1e-11), expected, exp)
    

def test_05_lower_upper_bounds(exp):
    vals = [-1.1e11, -1e11]
    expected = [{"lower-floats" : i} for i in vals]
    with pytest.raises(ValueError, match=r"Illegal range:.*"):
        make_simple_assert("lower-floats", (-1.1e11, -1e11, 1e11), expected, exp)

    with pytest.raises(ValueError, match=r"Illegal range:.*"):
        make_simple_assert("upper-floats", (-1e-11, 1.1e11, 1e11), [], exp)
    
    with pytest.raises(ValueError, match=r"Illegal range:.*"):
        make_simple_assert("upper-floats", (-1e-11, 1.1e11, 1e12), [], exp)

    with pytest.raises(ValueError, match=r"Illegal range:.*"):
        make_simple_assert("one-floats", (-1e-11, -1e-11, 1e-13), [], exp)



def test_06_combinations_simple(exp):
    input = {
        "x" : (1,2,1),
        "y" : (3,4,1)
    }
    expected = [
        {"x" : 1, "y" : 3},
        {"x" : 1, "y" : 4},
        {"x" : 2, "y" : 3},
        {"x" : 2, "y" : 4},
    ]

    assert expected == [i for i in exp.prepData(input)]

def test_07_combinations_medium(exp):
    input = {
        "x" : (1,2,1),
        "y" : (3,4,0),
        "z" : (0.5, 0.5, 2)
    }

    expected = [
        {"x" : 1, "y" : 3, "z" : 0.5},
        {"x" : 2, "y" : 3, "z" : 0.5},
    ]

    assert expected == [i for i in exp.prepData(input)]
    
def test_08_strings_simple(exp):
    input = {
        "x" : ["a", "b", "c"],
        "y" : (3,4,0)
    }

    expected = [
        {"x" : "a", "y" : 3},
        {"x" : "b", "y" : 3},
        {"x" : "c", "y" : 3},
    ]

    assert expected == [i for i in exp.prepData(input)]