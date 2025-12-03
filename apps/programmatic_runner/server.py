from datetime import datetime
import sys, os
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager
from core.util.api_ops import unload_zip, read_config, setup_runner
import runner
import tempfile
from fastapi.responses import FileResponse
import shutil

class ApiResponse(BaseModel):
    status: str
    message: str
    token: str


@asynccontextmanager
async def lifespan(app:FastAPI):
    # Setup
    if len(sys.argv) > 1:
        token = " ".join(sys.argv[1:])
    else:
        token = f"Service started at {datetime.utcnow().isoformat()}Z"
    
    app.state.session_token = token
    app.state.status = "ready"
    
    yield
    
    # Teardown

app = FastAPI(lifespan=lifespan)

@app.get("/health", response_model=ApiResponse)
async def health():
    if getattr(app.state, "status", "terminate") == "terminate":
        raise HTTPException(status_code=503, detail="Pod marked for termination")
    
    return ApiResponse(
        status=getattr(app.state, "status", "unknown🍋"),
        message="👍🎂",
        token=getattr(app.state, "session_token", "no token set")
    )

@app.post("/startExp", response_model=ApiResponse)
async def startExp(file: UploadFile = File(...)):
    exp_dir = unload_zip(file)
    yaml_manifest = read_config(exp_dir) # dictionary

    # setup globals and register addition modules
    setup_runner(yaml_manifest, exp_dir)

    # run exp
    filename = yaml_manifest["experiment"]["filename"]
    classname = yaml_manifest["experiment"]["className"]

    result_path = tempfile.mkdtemp()

    module_path = os.path.join(exp_dir, filename)
    runner.main(module_path, classname, result_path)

    app.state.exp_name = yaml_manifest["experiment"]["name"]
    app.state.result = result_path
    app.state.exp_dir = exp_dir
    app.state.status = "busy"

    return ApiResponse(
        message="experiment started",
        token=getattr(app.state, "session_token", "no token set"),
        status=getattr(app.state, "status", "unknown🍋")
    )

@app.get("/getExp", response_model=ApiResponse)
async def getExp():
    filename = getattr(app.state, "exp_name", "result")
    result_folder = getattr(app.state, "result")

    zip_path = tempfile.mkdtemp()
    zipped_result = shutil.make_archive(os.path.join(zip_path, filename), 'zip', result_folder)
    app.state.status = "terminate"

    return FileResponse(zipped_result, filename=filename)


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

