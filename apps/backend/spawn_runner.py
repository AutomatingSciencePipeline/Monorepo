"""Module that provides functionality to create a job for the runner"""

import time
import sys
from kubernetes import client, config
config.load_incluster_config()
batch_v1 = client.BatchV1Api()

def create_job_object(experiment_id: int):
    """Function that creates the job object for the runner"""
    # Configure Pod template container
    job_name = "runner-" + str(experiment_id) + "-" + str(time.time())
    container = client.V1Container(
        name="runner",
        image="sugiyat/image-test-runner:latest",
        command=["python3", "runner.py", str(experiment_id)])
    # Create and configure a spec section
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels={"app": "GLADOS"}),
        spec=client.V1PodSpec(restart_policy="Never", containers=[container]))
    # Create the specification of deployment
    spec = client.V1JobSpec(
        template=template,
        backoff_limit=4,
        ttl_seconds_after_finished=60)
    # Instantiate the job object
    return client.V1Job(
        api_version="batch/v1",
        kind="Job",
        metadata=client.V1ObjectMeta(name=job_name),
        spec=spec)

def create_job(api_instance, job):
    """Function that creates the job for the runner"""
    api_instance.create_namespaced_job(
        body=job,
        namespace="default")

def main(experiment_id: int):
    """Function that gets called when the file is ran"""
    runner = create_job_object(experiment_id)
    create_job(batch_v1, runner)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ValueError("Error: Too few arguments. Needs ID (ex: Python spawnRunner.py 1234)")
    elif len(sys.argv) > 2:
        raise ValueError("Error: Too many arguments. Needs ID (ex: Python spawnRunner.py 1234)")
    main(sys.argv[1])
