import pytest
import unittest
# import app
import json
pytest_plugins = ["docker_compose"]


@pytest.fixture(scope="module")  # to be module
def test_gen_config(module_scoped_container_getter):
    sample_json = [{'paramName': 'x', 'values': [1, 0, 4, 1], 'type': 'integer'}, {'paramName': 'y', 'values': [
        6, 5, 9, 1], 'type': 'integer'}, {'paramName': 'add', 'value': 'true', 'type': 'boolean'}]
    result = list(module_scoped_container_getter.get(
        "app-backend").gen_configs(sample_json))
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False


def test_gen_config_array(module_scoped_container_getter):
    sample_json = {'paramName': 'x', 'values': [1, 0, 1, 1], 'type': 'integer'}, {'paramName': 'y', 'values': [
         6, 5, 6, 1], 'type': 'integer'}, {'paramName': 'add', 'value': 'true', 'type': 'boolean'}
    result = list(module_scoped_container_getter.get(
        "app-backend").gen_configs(sample_json))
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
    # I have to figure out the input


def test_gen_config_add(module_scoped_container_getter):
    sample_json = [{'paramName': 'x', 'values': [1, 0, 4, 1], type: 'integer'}, {'paramName': 'y', 'value': [
            6, 5], type: 'integer'}, {"paramName": 'add', 'value': 'true', type: 'boolean'}]
    result = module_scoped_container_getter.get(
        "app-backend").gen_configs(sample_json)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
    #  # I have to figure out the input


def test_concat_array_empty(module_scoped_container_getter):
    array = ""
    result = module_scoped_container_getter.get(
        "app-backend").concat_arrays(array)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False


def test_concat_array_length_two(module_scoped_container_getter):
    array = ""
    result = module_scoped_container_getter.get(
            "app-backend").concat_arrays(array)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
    # need to make sure it throws on error
def test_np_uncode_invalidinput( module_scoped_container_getter):
    x = "blah"
    result = module_scoped_container_getter.get("app-backend").np_uncode(x)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
def test_np_uncode_integer(module_scoped_container_getter):  # need to make sure it an integer
    x = "blah"
    result = module_scoped_container_getter.get("app-backend").np_uncode(x)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
def test_np_uncode_float(module_scoped_container_getter):  # need to make sure it is an float
    x = "blah"
    result = module_scoped_container_getter.get("app-backend").np_uncode(x)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
def test_flatten_invalid(module_scoped_container_getter):
    x = "bob"
    result = module_scoped_container_getter.get("app-backend").flatten(x)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
def test_flatten_siimple(module_scoped_container_getter):
    x = "bob"
    result = module_scoped_container_getter.get("app-backend").flatten(x)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
        assert True
    else:
        assert False
def test_flatten_complex(module_scoped_container_getter):
    x = "bob"
    result = module_scoped_container_getter.get("app-backend").flatten(x)
    expected = "((0,6),(1,6),(1,5),(1,6))"
    print(result)
    if (result == expected):
         assert True
    else:
        assert False

if __name__ == '__main__':
     unittest.main()
  