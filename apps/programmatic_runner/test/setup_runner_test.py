from core.util.api_ops import read_config, setup_runner, register_additional_files
import shutil, pytest, os, importlib, sys

@pytest.fixture(scope="module")
def test_manifest():
    # Setup
    pth = "./runner/test/test_manifest/manifest.yaml"
    shutil.copy("./runner/test/test_manifest/simple_add_manifest.yaml", pth)

    yield pth


@pytest.fixture(scope="module")
def exp_path():
    # Setup
    dir_path = "./runner/test/tmp_exp_dir"
    if (os.path.exists(dir_path)):
        shutil.rmtree(dir_path)

    os.mkdir(dir_path)

    pth = os.path.join(dir_path, "manifest.yaml")
    shutil.copy("./runner/test/test_manifests/simple_add_manifest.yaml", pth)

    pth =  os.path.join(dir_path)
    shutil.copy("./runner/test/test_classes/logic_gates.py", pth)
    shutil.copy("./runner/test/test_classes/my_map_cps.py", pth)

    yield dir_path
    # Teardown
    shutil.rmtree(dir_path)

def test_01_additional_files_parsing(exp_path):

    manifest = read_config(exp_path)
    expected = ["logic_gates.py", "my_map_cps.py"]

    assert expected == setup_runner(manifest, exp_path)["additional_files"]

def test_02_additional_files_registering_simple_func(exp_path):
    module_name = "logic_gates"
    if module_name in sys.modules:
        del sys.modules[module_name]

    manifest = read_config(exp_path)
    file_list = manifest["additional_files"]
    register_additional_files(file_list, exp_path)

    mod = importlib.import_module(module_name)

    assert False == mod.my_xnor(0, 1)

def test_03_additional_files_registering_complex_func(exp_path):
    module_name = "my_map_cps"
    if module_name in sys.modules:
        del sys.modules[module_name]

    manifest = read_config(exp_path)
    file_list = manifest["additional_files"]
    register_additional_files(file_list, exp_path)

    mod = importlib.import_module(module_name)

    add1_cps = lambda val, k: (
        mod.apply_k(k, val + 1)
    )

    result = mod.map_cps(add1_cps, [1, 2, 3, 4, 5], mod.Continuation.Init_k())
    assert result == [2, 3, 4, 5, 6]

def test_04_additional_files_registering_dependency(exp_path):
    module_name = "my_map_cps"
    if module_name in sys.modules:
        del sys.modules[module_name]

    manifest = read_config(exp_path)
    file_list = manifest["additional_files"]
    register_additional_files(file_list, exp_path)

    mod = importlib.import_module(module_name)
    ls1 = [0, 0, 1, 1]
    ls2 = [1, 0, 1, 0]
    expected = [False, False, True, False]

    result = mod.map_cps_2(mod.and_cps, ls1, ls2, mod.Continuation.Init_k())
    assert result == expected