import sys, importlib.util, os
from fastapi import HTTPException
def load_module(module_path: str):
    module_name = os.path.splitext(os.path.basename(module_path))[0]
    if module_name in sys.modules:
        return sys.modules[module_name] 
    
    module_path = os.path.abspath(module_path)
    module_dir = os.path.dirname(module_path)

    if module_dir not in sys.path:
        sys.path.insert(0, module_dir)

    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)        
    
    sys.modules[module_name] = module
    spec.loader.exec_module(module)

    return module


def load_class(module_name : str, class_name : str, module):

    if not hasattr(module, class_name):
        raise HTTPException(status_code=400, detail=f"Experiment class '{class_name}' not found in {module_name}.py")
    cls = getattr(module, class_name)

    cls.__module__ = module_name

    return cls