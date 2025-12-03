import pytest, os, shutil
import pandas as pd
from core.util.module_ops import load_module

# TODO: Make these run in parallel
@pytest.fixture
def result_path():
    # Setup
    result_path = "./runner/test/test_results"
    if (os.path.exists(result_path)):
        shutil.rmtree(result_path)

    os.mkdir(result_path)

    yield result_path
    # Teardown
    shutil.rmtree(result_path)

@pytest.fixture(scope="module")
def arb_exp_path():
    # Setup
    pth = "../test_exp.py"
    shutil.copy("./runner/test/test_classes/exp_demo.py", pth)

    yield pth
    # Teardown
    os.remove(pth)

@pytest.fixture(scope="session")
def runner():
    # Setup
    module_path = "./runner/runner.py"
    module = load_module(module_path)

    yield module

def test_01_results_exists(result_path, runner):
    runner.main("./runner/test/test_classes/exp_demo.py","MyExperiment", result_path)

    assert True == os.path.exists(os.path.join(result_path, "output.csv"))
    assert True == os.path.exists(os.path.join(result_path, "plot.png"))

def test_01B_results_exists_arbitrary_path(result_path, runner, arb_exp_path):
    runner.main(arb_exp_path,"MyExperiment", result_path)

    assert True == os.path.exists(os.path.join(result_path, "output.csv"))
    assert True == os.path.exists(os.path.join(result_path, "plot.png"))

def df_equal_ignore_order(df1, df2):
    df1_sorted = df1.sort_values(by=df1.columns.tolist()).reset_index(drop=True)
    df2_sorted = df2.sort_values(by=df2.columns.tolist()).reset_index(drop=True)
    return df1_sorted.equals(df2_sorted)

def test_02_results_accurate(result_path, runner):
    runner.main("./runner/test/test_classes/simple_add.py","MyAddExperiment", result_path)

    x =  [2, 0, 1, 5, 4, 3, 0, 1, 2, 3, 4, 5]
    y =  [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]
    expected_data = {
        'x' : x,
        'y' : y,
        'r' : [i + j for i , j in zip(x, y)]
    }

    df = pd.read_csv(os.path.join(result_path, "output.csv"))
    df_expected = pd.DataFrame(expected_data)

    assert True == df_equal_ignore_order(df, df_expected)
