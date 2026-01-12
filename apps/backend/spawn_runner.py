"""Module that provides functionality to create a job for the runner"""

import os
import time
import sys
import yaml
import json
from kubernetes import client, config
config.load_incluster_config()
batch_v1 = client.BatchV1Api()
RUNNER_PATH = "./job-runner.yaml"

def create_job_object(experiment_data):
    """Function that creates the job object for the runner"""
    # Configure Pod template container
    job_name = "runner-" + experiment_data['experiment']['id']
    
    job_command = ["python3", "runner_handler.py", json.dumps(experiment_data)]

    runner_body = get_yaml_file_body(RUNNER_PATH)

    runner_body['metadata']['name'] = job_name
    runner_body['spec']['template']['spec']['containers'][0]['command'] = job_command
    runner_body['spec']['template']['spec']['initContainers'][0]['command'] = ["python3", "data_handler.py", json.dumps(experiment_data)]
    if os.getenv("IMAGE_RUNNER"):
        # Get the image name
        image_name = str(os.getenv("IMAGE_RUNNER"))
        runner_body['spec']['template']['spec']['containers'][0]['image'] = image_name

    return runner_body

def create_job(api_instance, job):
    """Function that creates the job for the runner"""
    api_instance.create_namespaced_job(
        body=job,
        namespace="default")

def main(experiment_id: int):
    """Function that gets called when the file is ran"""
    runner = create_job_object(experiment_id)
    create_job(batch_v1, runner)

def get_yaml_file_body(file_path):
    """Function to get yaml file from body"""
    body = None
    with open(file_path, encoding="utf-8") as yaml_file:
        body = yaml.safe_load(yaml_file)
    return body

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ValueError("Error: Too few arguments. Needs ID (ex: python spawn_runner.py 1234)")
    elif len(sys.argv) > 2:
        raise ValueError("Error: Too many arguments. Needs ID (ex: python spawn_runner.py 1234)")
    main(sys.argv[1])
