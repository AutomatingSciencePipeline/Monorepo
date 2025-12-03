import sys, os
from core.util.module_ops import load_module, load_class
  
def main(module_path : str, class_name : str, result_path : str):
    if not os.path.exists(module_path):
        raise FileNotFoundError(f"No file found at: {module_path}")
    
    loaded_module = load_module(module_path)
    
    module_name = os.path.splitext(os.path.basename(module_path))[0]
    UserExpClass = load_class(module_name, class_name, loaded_module)
    
    experiment = UserExpClass(result_path)
    experiment.doExperiment()

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])