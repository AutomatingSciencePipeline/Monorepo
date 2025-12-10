import argparse
import os
import sys
import typing
import zipfile
import time
from typing import Any, Dict, Optional
import requests
from datetime import datetime

API_HOST = "http://localhost:3000"

CLIENT_ID = os.getenv("GLADOS_CLIENT_ID")

DEVICE_CODE_URL = "https://github.com/login/device/code"
ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
VIEW_EXPERIMENT_URL = f"{API_HOST}/api/experiments/queryExp"
AUTH_URL = f"{API_HOST}/api/auth/tokenAuth/token"
UPLOAD_EXPERIMENT_URL = f"{API_HOST}/api/files/uploadFileCLI"
SUBMIT_EXPERIMENT_URL = f"{API_HOST}/api/experiments/submitExp"
START_EXPERIMENT_URL = f"{API_HOST}/api/experiments/start/"
DOWNLOAD_EXPERIMENT_RESULTS_URL = f"{API_HOST}/api/download/experimentResult"

EX_UNKNOWN = -2
EX_PARSE_ERROR = -1
EX_SUCCESS = 0
EX_INVALID_TOKEN = 1
EX_NOTFOUND = 2
EX_INVALID_EXP_FORMAT = 3
EX_NOT_DONE = 4
EX_EXP_FAILED = 5

class RequestManager(object):
    def __init__(self):
        pass  # Initialization code for RequestManager
    
    def generate_token(self) -> Dict[str, Any]:
        device_code_url = DEVICE_CODE_URL
        scope = "read:user user:email"
        data_GitHub = {"client_id": CLIENT_ID, "scope": scope}
        try:
            res = requests.post(device_code_url, data=data_GitHub, headers={"Accept": "application/json"}, timeout=20)
        except requests.RequestException as error:
            return {"access_token": None, "error": f'{error}'}
        data = res.json()
        device_code = data['device_code']
        expire_time = data['expires_in']
        interval = data['interval']
        user_code = data['user_code']
        current_time = 0
        print(f"Please enter the following user code: {user_code} at the following address: {data['verification_uri']}")
    
        while (current_time < expire_time):
            access_token_url = ACCESS_TOKEN_URL
            data_GitHub = {"client_id":CLIENT_ID, "device_code": device_code, "grant_type": "urn:ietf:params:oauth:grant-type:device_code"}
            time.sleep(interval)
            res = requests.post(access_token_url, data=data_GitHub, headers={"Accept": "application/json"}, timeout=interval)
            current_time += interval
            response = res.json()
            if "access_token" in response:
                access_token = response['access_token']
                return {"access_token": access_token, "error": None}
            elif  response.get("error") == "authorization_pending":
                continue
            elif response.get("error") == "slow_down":
                interval +=5
            elif response.get("error") == "incorrect_client_credentials":
                return {"access_token": None, "error": "Incorrect client credentials"}
            elif response.get("error") == "expired_token":
                return {"access_token": None, "error": "Token is expired"}
            elif response.get("error") == "access_denied":
                return {"access_token": None, "error": "Access is denied"}
            elif response.get("error") == "incorrect_device_code":
                return {"access_token": None, "error": "Incorrect device code"}
        return {"access_token": None, "error": "Time out occurred"}   
        # Implementation for generating a device token for authorization   
    
    def authenticate(self, token: str) -> Dict[str, typing.Any]:
        try:
            user_token = {"token": token}
            res = requests.post(AUTH_URL, verify=False, json=user_token, timeout=5)
            response = res.json()
            self.token: str = token
            return {"uid": response["_id"], "error": None}
        except requests.RequestException as error:
            return {"uid": None, "error": f'{error}'}
        # Implementation for authenticating with the provided token
    
    def upload_and_start_experiment(self, experiment_path: str) -> Dict[str, typing.Any]:
        files = {
            "file": open(experiment_path, "rb")
        }
        data = {
            "userToken": self.token
        }
        try:
            res = requests.post(UPLOAD_EXPERIMENT_URL, verify=False, files=files, data=data, timeout=40)
            time.sleep(5)
        except requests.RequestException as error:
            perror(f'{error}')

        submitted_exec_file = res.json()
        files = {
            "file": open("manifest.yml", "rb")
        }
        data = {
            "userToken": self.token,
            "execFileID": submitted_exec_file['fileId']
        }
        try:
            res = requests.post(SUBMIT_EXPERIMENT_URL, verify=False, files=files, data=data, timeout=40)
            submitted_exp = res.json()
            time.sleep(5)
        except requests.RequestException as error:
            perror(f'{error}')
        try:
            json ={"id": submitted_exp["expId"]}
            res = requests.post(START_EXPERIMENT_URL + submitted_exp["expId"], json=json, verify=False, timeout=40)
        except requests.RequestException as error:
            perror(f'{error}')
            
        return {
            'success': True,
            'error': '',
            'exp_id': submitted_exp["expId"]
        }
    
    def query_experiments(self, experiment_name: str) -> Dict[str, typing.Any]:
        experiment_req_json = {
            "token": self.token,
            "exp_title": experiment_name
        }
        try:
            res = requests.post(VIEW_EXPERIMENT_URL, verify=False, json=experiment_req_json, timeout=20)
        except requests.RequestException as error:
            perror(f'{error}')
        return res.json()
    
    def download_experiment_results(self, experiment_id: str) -> Dict[str, typing.Any]:
        experiment_req_json = {
            "token": self.token,
            "expID": experiment_id
        }
        try:
            res = requests.post(DOWNLOAD_EXPERIMENT_RESULTS_URL, verify=False, json=experiment_req_json, timeout=20)
            
            if(res.headers.get("Content-Disposition") is None):
                return { 'success': False, 'error': res.content.decode('utf-8') }
            
            cd = res.headers.get("Content-Disposition", "")
            filename = "results.csv"

            if "filename=" in cd:
                filename = cd.split("filename=")[1].strip('"')

            with open(filename, "wb") as f:
                f.write(res.content)

            return { 'success': True, 'files': [{'name': filename, 'content': res.content}] }
            
        except requests.RequestException as error:
            perror(f'{error}')
    
def perror(*args, **kwargs) -> None:
    """Prints to stderr."""
    print(*args, file=sys.stderr, **kwargs)
    
def generate_token(request_manager: RequestManager) -> str:
    result = request_manager.generate_token()
    access_token = result["access_token"]
    error = result["error"]
    if error is None:
        print(f"Your token is: {access_token}")
        return access_token
    else:
        perror(f'{result["error"]}')

def validate_token(request_manager: RequestManager, token: str) -> bool:
    """Validates the provided authentication token."""
    result = request_manager.authenticate(token)
    return result['error'] is None

def upload_and_start_experiment(request_manager: RequestManager, experiment_path: str) -> int:
    """Uploads and starts an experiment given the path to the experiment ZIP file."""
    if not os.path.isfile(experiment_path):
        perror(f"error: Experiment file '{experiment_path}' not found.")
        return EX_NOTFOUND
    # validation_error = validate_experiment_file(experiment_path)
    # if validation_error is not None:
    #     perror(f"error: {validation_error}")
    #     return EX_INVALID_EXP_FORMAT

    results = request_manager.upload_and_start_experiment(experiment_path)
    if not results.get('success', False):
        perror(f"error: backend: {results.get('error')}")
        return EX_INVALID_EXP_FORMAT if results['error'] == 'bad_format' else EX_UNKNOWN
    
    print(f"Experiment started successfully (ID = {results['exp_id']}).")
    return EX_SUCCESS


def query_experiments(request_manager: RequestManager, title: str):
    results = request_manager.query_experiments(title)
    if not results["matches"]:
        perror("error: No experiments found.")
        return EX_NOTFOUND
    print("Matches:")
    for index, match in enumerate(results["matches"]):
        s = match["started_on"] / 1000.0
        time_started = datetime.fromtimestamp(s)
        print("***********************************************")
        print(f"Experiment {index + 1}: {match['name']}")
        print("***********************************************")
        print(f"ID: {match['id']}")
        print(f"Status: {match['status']}")
        print(f"Time Started: {time_started}")
        print(f"Trials: {match['current_permutation']}/{match['total_permutations']} Completed\n")
    return EX_SUCCESS

def download_experiment(request_manager: RequestManager, experiment_id: str) -> int:
    results = request_manager.download_experiment_results(experiment_id)
    if not results.get("success", False):
        msg, status = {
            'not_found': ("Experiment not found.", EX_NOTFOUND),
            'not_done': ("Experiment is still running.", EX_NOT_DONE),
            'exp_failed': ("Experiment did not complete successfully.", EX_EXP_FAILED)
        }[results.get("error")]
        perror(msg)
        return status
    
    print(f"Experiment results downloaded successfully to './{results['files'][0]['name']}'.")
    return EX_SUCCESS

def validate_experiment_file(filepath: str) -> Optional[str]:
    if not zipfile.is_zipfile(filepath):
        return f"'{filepath}' is in an invalid format."
    with zipfile.ZipFile(filepath, 'r') as zf:
        if 'manifest.yaml' not in zf.namelist():
            return f"'{filepath}' is missing 'manifest.yaml'."
    return None

def store_token(token: str) -> str:
    with open(".token.glados", "w") as token_file:
        token_file.write(token)
    return EX_SUCCESS

def get_token() -> str:
    with open(".token.glados", "r") as token_file:
        token = token_file.read().strip()
    return token

def parse_args(request_manager: RequestManager, args: Optional[typing.Sequence[str]]=None, stdout = sys.stdout, stderr = sys.stderr) -> int:
    
    # Save original stdout and stderr
    _out, _err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = stdout, stderr
    
    parser = argparse.ArgumentParser(
        prog="GLADOS CLI",
        description="The command line interface for GLADOS.")
    parser.add_argument('--generate-token', action='store_true', help='Generate a new authentication token and exit, regardless of other options used.')
    parser.add_argument('--token',  '-t', type=str, help='Authentication token to use. If none is provided, it will either read ".token.glados" or prompt to generate a new token.')
    parser.add_argument('--upload', '-z', type=str, help='Upload a ZIP file. Cannot be used with -q, or -d.')
    parser.add_argument('--query',  '-q', type=str, help='Query experiment status of experiments with a given name. If the name is "*", show all experiments. Cannot be used with -z or -d.')
    parser.add_argument('--download', '-d', type=str, help='Download the results of a completed experiment. Cannot be used with -z or -s.')
    
    parsed = parser.parse_args(args)
    
    # TODO: this section probably needs to be refactored!
    if not exactly_one([parsed.upload, parsed.query, parsed.download]) and not parsed.generate_token and not parsed.token:
        perror("error: Exactly one of -z, -q, or -d must be provided.")
        return EX_PARSE_ERROR
    elif not parsed.token and not parsed.generate_token:
        if not os.path.exists(".token.glados"):
            perror("error: No token provided and no stored token found. Please generate a token using --generate-token.")
            return EX_INVALID_TOKEN
        else:
            parsed.token = get_token()
            
    if parsed.generate_token:
        generate_token(request_manager)
    elif parsed.token:
        result = store_token(parsed.token)
        if result != EX_SUCCESS:
            perror("error: An unexpected error occurred while storing the token.")
        if not request_manager.authenticate(parsed.token):
            perror("error: Cannot authenticate token - check your internet connection and token.")
            return EX_INVALID_TOKEN
    
    # Authentication successful, proceed with requested operation
    result = EX_SUCCESS
        
    if parsed.upload:
        result = upload_and_start_experiment(request_manager, parsed.upload)
    if parsed.query:
        result = query_experiments(request_manager, parsed.query)
    if parsed.download:
        result = download_experiment(request_manager, parsed.download)
    
    # Restore original stdout and stderr
    sys.stdout, sys.stderr = _out, _err
    return result


def exactly_one(args : typing.Sequence[str]) -> bool:
    """Returns True if exactly one argument in args is not None."""
    return sum(1 for arg in args if arg) == 1
    

def main():
    parse_args(RequestManager()) 
    

if __name__ == "__main__":
    main()