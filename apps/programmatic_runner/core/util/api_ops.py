from fastapi import File, HTTPException
import zipfile, tempfile, shutil, os
from pathlib import Path
import yaml
from core.util.module_ops import load_module

def unload_zip(file: File):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")

    temp_dir = tempfile.mkdtemp()

    try:
        zip_path = Path(temp_dir) / file.filename
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        return os.path.join(temp_dir,os.path.splitext(file.filename)[0])

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def read_config(dir_path : str):
    manifest_path = os.path.join(dir_path, "manifest.yaml")
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=400, detail=f"No manifest found in {dir_path}")

    with open(manifest_path, "r") as stream:
        try:
            data = yaml.safe_load(stream)
            return data 
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Error reading manifest: {e}")

def register_additional_files(file_list, exp_dir):
    for file in file_list:
        file_path = os.path.join(exp_dir, file)
        if os.path.exists(file_path):
            load_module(file_path)


def setup_runner(manifest, exp_dir):

    global_vars = manifest.get("global_vars", None)
    additional_files = manifest.get("additional_files", None)

    if global_vars is not None:
        # TODO
        pass 


    if additional_files is not None:
        register_additional_files(manifest["additional_files"], exp_dir)

    return {"gobalvars": global_vars, "additional_files": additional_files} # return for debugging and tests
    


