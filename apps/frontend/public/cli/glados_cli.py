import argparse
from pathlib import Path
import os
import sys
import typing
import yaml
import time
import zipfile
from typing import Any, Dict, Optional
import hashlib
import requests
from datetime import datetime
import urllib3

API_HOST = "https://glados.csse.rose-hulman.edu/"

CLIENT_ID = os.getenv("GLADOS_CLIENT_ID")

DEVICE_CODE_URL = "https://github.com/login/device/code"
ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
VIEW_EXPERIMENT_URL = f"{API_HOST}/api/cli/queryExp"
AUTH_URL = f"{API_HOST}/api/cli/tokenAuth"
UPLOAD_EXPERIMENT_URL = f"{API_HOST}/api/cli/uploadFile"
SUBMIT_EXPERIMENT_URL = f"{API_HOST}/api/cli/submitExp"
START_EXPERIMENT_URL = f"{API_HOST}/api/experiments/start/"
DOWNLOAD_EXPERIMENT_RESULTS_URL = f"{API_HOST}/api/cli/downloadResult"
DOWNLOAD_EXPERIMENT_LOG_URL = f"{API_HOST}/api/cli/downloadLogs"
DOWNLOAD_EXPERIMENT_ZIP_URL = f"{API_HOST}/api/cli/downloadZip"
VERSION_URL = (
    "https://api.github.com/repos/"
    "AutomatingSciencePipeline/Monorepo/"
    "contents/apps/frontend/public/cli/glados_cli.py"
    "?ref=main"
)
DOWNLOAD_CLI_URL = ("https://raw.githubusercontent.com/"
                "AutomatingSciencePipeline/Monorepo"
                "/main/apps/frontend/public/cli/glados_cli.py")

EX_UNKNOWN = -2
EX_PARSE_ERROR = -1
EX_SUCCESS = 0
EX_INVALID_TOKEN = 1
EX_NOTFOUND = 2
EX_INVALID_EXP_FORMAT = 3
EX_NOT_DONE = 4
EX_EXP_FAILED = 5
UPDATE_SUCCEED = 6
UPDATE_FAIL = 7
VALID_EXP_FORMAT = 8

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
            if(response.get("_id") is None):
                return {"uid": None, "error": "User not found"}
            return {"uid": response["_id"], "error": None}
        except requests.RequestException as error:
            return {"uid": None, "error": f'{error}'}
        # Implementation for authenticating with the provided token
        
    def version(self, cli_path) -> Dict[str, typing.Any]:
        try:
            res = requests.get(VERSION_URL, timeout=10)
            res.raise_for_status()

            data = res.json()
            remote_sha = data["sha"]
            
            with open(cli_path, "rb") as f:
                content = f.read()

            header = f"blob {len(content)}\0".encode()
            store = header + content

            local_sha = hashlib.sha1(store).hexdigest()
            
            if local_sha == remote_sha:
                return {"up_to_date": True, "success": True}
            else:
                return {"up_to_date": False, "success": True}
            
        except requests.RequestException as error:
            return {"error": error, "success": False}
        
    def update(self) -> Dict[str, typing.Any]:
        try:
            res = requests.get(DOWNLOAD_CLI_URL, timeout=10)
            res.raise_for_status()
            
            path = Path("glados_cli.py")
            old_path = path.with_stem(path.stem + "_old")

            if path.exists():
                os.replace(path, old_path) 

            with open(path, "wb") as f:
                f.write(res.content)
                
            return {"error": False, "success": True}
        
        except requests.RequestException as error:
            return {"error": error, "success": False}
    
    def upload_and_start_experiment(self, experiment_path: str) -> Dict[str, typing.Any]:
        filename = os.path.basename(experiment_path)
        files = {
            "file": (filename, open(experiment_path, "rb"), "application/octet-stream")
        }
        data = {
            "userToken": self.token
        }
        try:
            res = requests.post(UPLOAD_EXPERIMENT_URL, verify=False, files=files, data=data, timeout=40)
            time.sleep(5)
        except requests.RequestException as error:
            perror(f'{error}')
        if(res is None):
            return {
            'success': False,
            'error': 'other',
            'exp_id': ''
        }  
        submitted_exec_file = res.json()
        if(submitted_exec_file.get("fileId") is None):
            return {
            'success': False,
            'error': submitted_exec_file.get('message'),
            'exp_id': ''
            }   
            
        files = {
            "file": open("manifest.yml", "rb")
        }
        data = {
            "userToken": self.token,
            "execFileID": submitted_exec_file['fileId']
        }
        try:
            uploadMessage = submitted_exec_file["message"]
            print(uploadMessage)
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
            
            if(res.status_code != 200):
                try:
                    error_msg = res.json().get("response", res.text)
                except ValueError:
                    error_msg = res.text
                return {'success': False, 'error': error_msg}
            
            cd = res.headers.get("Content-Disposition", "")
            filename = "results.csv"

            if "filename=" in cd:
                filename = cd.split("filename=")[1].strip('"')

            with open(filename, "wb") as f:
                f.write(res.content)
            return { 'success': True, 'files': [{'name': filename, 'content': res.content}] }
        except requests.RequestException as error:
            perror(f'{error}')
            
    def download_all(self, experiment_id: str) -> Dict[str, typing.Any]:
        experiment_req_json = {
            "token": self.token,
            "expID": experiment_id
        }
        try:
            res = self.download_experiment_results(experiment_id)
            if(res.get('success') is not True):
                return res
        except requests.RequestException as error:
            perror(f'{error}')
            
        filename = res['files'][0]['name'].replace(".csv", "")
            
        try:
            res = requests.post(DOWNLOAD_EXPERIMENT_LOG_URL, verify=False, json=experiment_req_json, timeout=20)
            if(res.status_code != 200):
                try:
                    error_msg = res.json().get("response", res.text)
                except ValueError:
                    error_msg = res.text
                return {'success': False, 'error': error_msg}
            with open(filename, "wb") as f:
                f.write(res.content)
        except requests.RequestException as error:
            perror(f'{error}')
           
        try:
            res = requests.post(DOWNLOAD_EXPERIMENT_ZIP_URL, verify=False, json=experiment_req_json, timeout=20)
            if(res.status_code != 200):
                try:
                    error_msg = res.json().get("response", res.text)
                except ValueError:
                    error_msg = res.text
                return {'success': False, 'error': error_msg}
            with open(f"{filename}_results.zip", "wb") as f:
                f.write(res.content)
        except requests.RequestException as error:
            perror(f'{error}')
            
        return { 'success': True, 'files': [{'name': "All System Artifacts", 'content': res.content}] }
    
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
    """Uploads and starts an experiment given the path to the experiment file."""
    if not os.path.isfile(experiment_path):
        perror(f"error: Experiment file '{experiment_path}' not found.")
        return EX_NOTFOUND
    
    if not os.path.isfile("manifest.yml"):
        perror("error: file 'manifest.yml' not in current directory.")
        return EX_INVALID_EXP_FORMAT
    else:
        formatting_correctness = check_manifest_format("manifest.yml", zipfile.is_zipfile(experiment_path))
        if formatting_correctness is EX_INVALID_EXP_FORMAT:
            perror("error: Experiment cannot be submitted until above manifest.yml attributes errors are fixed.")
            return EX_INVALID_EXP_FORMAT

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
        if match["started_on"]  == 0 or match["started_on"] is None:
            time_started = "N/A"
            status = "FAILED"
        else:
            s = match["started_on"] / 1000.0
            time_started = datetime.fromtimestamp(s)
            status = match['status']
        print("***********************************************")
        print(f"Experiment {index + 1}: {match['name']}")
        print("***********************************************")
        print(f"ID: {match['id']}")
        print(f"Tags: {match['tags']}")
        print(f"Status: {status}")
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
    
    print(f"Experiment results {results['files'][0]['name']} downloaded successfully.")
    return EX_SUCCESS

def download_all(request_manager: RequestManager, experiment_id: str) -> int:
    results = request_manager.download_all(experiment_id)
    if not results.get("success", False):
        msg, status = {
            'not_found': ("Experiment not found.", EX_NOTFOUND),
            'not_done': ("Experiment is still running.", EX_NOT_DONE),
            'exp_failed': ("Experiment did not complete successfully.", EX_EXP_FAILED)
        }[results.get("error")]
        perror(msg)
        return status
    
    print(f"All experiment artifacts downloaded successfully.")
    return EX_SUCCESS

def check_version(request_manager: RequestManager, cli_path: str) -> None:
    results = request_manager.version(cli_path)
    if not results.get("success", False):
        error = results.get("error", "Unknown")
        print(f"Unable to confirm version of CLI.\nError: {error} \n It is recommended you re-download the script directly from the website: https://glados.csse.rose-hulman.edu/\n")
    else:
        if not results.get("up_to_date", False):
            print("CLI version is not up to date. It is suggested to update the script by using -u command.\n")
       
def update(request_manager: RequestManager) -> int:
    results = request_manager.update()
    if not results.get("success", False):
        print("Unable to download most up-to-date version.")
        return UPDATE_FAIL
    else: 
        print("Downloaded most up-to-date CLI successfully in local directory.")
        return UPDATE_SUCCEED
 
def check_manifest_format(manifest_path: str, is_zip_file: bool) -> int:
    with open(manifest_path, "r", encoding='utf-8') as f:
        config = yaml.safe_load(f)
    scatter_present = True
    results = [
    check_manifest_format_str_helper(config, "name", "manifest.yml"),
    check_manifest_format_str_helper(config, "trialResult", "manifest.yml"),
    check_manifest_format_int_helper(config, "trialResultLineNumber", -1, True, "manifest.yml"),
    check_manifest_format_int_helper(config, "timeout", 0, True, "manifest.yml"),
    check_manifest_format_int_helper(config, "workers", 0, True, "manifest.yml"),
    check_manifest_format_bool_helper(config, "keepLogs", "manifest.yml"),
    check_manifest_format_bool_helper(config, "sendEmail", "manifest.yml"),
    check_manifest_format_hyperparameter_helper(config, "hyperparameters"),
    ]
    if not check_manifest_format_bool_helper(config, "scatter", "manifest.yml"):
        results.append(False)
        scatter_present = False
    if scatter_present:
        if config["scatter"] is True:
            results.append(check_manifest_format_str_helper(config, "scatterIndVar", "manifest.yml"))
            results.append(check_manifest_format_str_helper(config, "scatterDepVar", "manifest.yml"))
        elif config["scatter"] is False:
            ind_var = config.get("scatterIndVar", None)
            dep_var = config.get("scatterDepVar", None)
            if not ((ind_var == "" ) and (dep_var == "")):
                print("scatterIndVar and scatterDepVar attributes in manifest.yml must be '' when scatter is false.")
                results.append(False)
    if is_zip_file is True:
        results.append(check_manifest_format_str_helper(config, "experimentExecutable", "manifest.yml"))
    if all(results) is False:
        return EX_INVALID_EXP_FORMAT
    else:
        return VALID_EXP_FORMAT
    
def check_manifest_format_hyperparameter_helper(config: dict, key: str) -> bool:
    correct_param_formatting = True
    value = config.get(key, None)
    if value is None or value == "":
        print("hyperparameters attribute in 'manifest.yml' is empty or missing.")
        return False
    else:
        for param in config["hyperparameters"]:
            name = param.get("name", None)
            param_type = param.get("type", None)
            result = [
                check_manifest_format_str_helper(param, "name", "hyperparameter " + name),
                check_manifest_format_str_helper(param, "type", "hyperparameter " + name),
                check_manifest_format_bool_helper(param, "useDefault", "hyperparameter " + name)
            ]
            if all(result):
                if param_type == "integer":
                    correct_param_formatting = check_number_hyperparameter_helper(param, name, True)
                elif param_type == "float":
                    correct_param_formatting = check_number_hyperparameter_helper(param, name, False)
                elif param_type == "bool":
                    correct_param_formatting = check_manifest_format_bool_helper(param, "default", "hyperparameter " + name)
                elif param_type == "stringlist":
                    correct_param_formatting = check_string_list_hyperparameter_helper(param, name)
                elif param_type == "paramgroup":
                    pass
                else:
                    print(f"Type specified in hyperparameter {name} is not integer, float, bool, stringlist, or paramgroup.")
                    correct_param_formatting = False
    return all(result) and correct_param_formatting

def check_string_list_hyperparameter_helper(param: dict, name: str) -> bool:
    correct_string_list_param_formatting = True
    if not isinstance(param["values"], list):
        print(f"values attribute in hyperparameter {name} is not a list.")
        correct_string_list_param_formatting = False
    elif not all(isinstance(item, str) for item in param["values"]):
        print(f"values attribute in hyperparameter {name} is not a list of strings.")
        correct_string_list_param_formatting = False
    return correct_string_list_param_formatting and check_manifest_format_str_helper(param, "default", f"hyperparameter {name}")

def check_number_hyperparameter_helper(param: dict, name: str, test_int: bool) -> bool:
    correct_min = check_manifest_format_int_helper(param, "min", float('-inf'), test_int, "hyperparameter " + name )
    if test_int:
        correct_max = (check_manifest_format_int_helper(param, "max", int(param["min"]), test_int, "hyperparameter " + name) if correct_min else check_manifest_format_int_helper(param, "max", float('-inf'), True, "hyperparameter " + name))
    else:
        correct_max = (check_manifest_format_int_helper(param, "max", float(param["min"]), test_int, "hyperparameter " + name) if correct_min else check_manifest_format_int_helper(param, "max", float('-inf'), test_int, "hyperparameter " + name)) 
    return correct_min and correct_max and check_manifest_format_int_helper(param, "step", -1, test_int, "hyperparameter " + name) and check_manifest_format_int_helper(param, "default", float('-inf'), test_int, "hyperparameter " + name)

def check_manifest_format_int_helper(config: dict, key: str, greater_than: int, test_int: bool, message_name: str) -> bool:
    value = config.get(key, None)
    if not(value is None or value == ""):
        try:
            value = (int(value) if test_int else float(value))
            if value <= greater_than:
                print(f"{key} attribute in {message_name} is not greater than {greater_than}.")
                return False
        except ValueError:
            if test_int:
                print(f"{key} attribute in {message_name} is not an integer.")
            else:
                print(f"{key} attribute in {message_name} is not a float.")
            return False
    else:
        print(f"{key} attribute in {message_name} is empty or missing.")
        return False
    return True

def check_manifest_format_str_helper(config: dict, key: str, message_name: str) -> bool:
    value = config.get(key, None)
    if (value is None or value == "") or not isinstance(value, str):
        print(f"{key} attribute in {message_name} is empty, missing, or not a string.")
        return False
    return True
    
def check_manifest_format_bool_helper(config: dict, key: str, message_name: str) -> bool:
    value = config.get(key, None)
    if (value is None or value == "") or not isinstance(value, bool):
        print(f"{key} attribute in {message_name} is empty, missing, or not true or false.")
        return False
    return True

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
    parser.add_argument('--upload', '-z', type=str, help='Upload an experiment file with a given file path. Cannot be used with -u, -q, -d, or -da.')
    parser.add_argument('--query',  '-q', type=str, help='Query experiment status of experiments with a given name. If the name is "*", show all experiments. Cannot be used with -u, -z, -d, or -da.')
    parser.add_argument('--download', '-d', type=str, help='Download the results of a completed experiment. Cannot be used with -u, -z, -da, or -q.')
    parser.add_argument('--download-all', '-da', type=str, help='Download all artifacts from an experiment. Cannot be used with -u, -z, -d, or -q.')
    parser.add_argument('--update', '-u', action='store_true', help='Downloads most up-to-date CLI version. Cannot be used with -z, -q, -d, or -da.')
    
    parsed = parser.parse_args(args)
    
    if parsed.update:
        return update(request_manager)
    else:
        check_version(request_manager, "glados_cli.py")

    if not exactly_one([parsed.upload, parsed.query, parsed.download, parsed.download_all]) and not parsed.generate_token and not parsed.token:
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
        auth_result = request_manager.authenticate(parsed.token)
        if type(auth_result) is bool:
            if auth_result is False:
                perror("error: Cannot authenticate token - check your internet connection and token.")
                return EX_INVALID_TOKEN
        elif auth_result.get("uid") is None:
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
    if parsed.download_all:
        result = download_all(request_manager, parsed.download_all)
    
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
    
    
