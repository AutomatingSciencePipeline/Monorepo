"""Module that provides functionality to create a job for the runner"""
from modules.runner_job import build_runner_job, load_runner_template

RUNNER_NAMESPACE = "default"


def create_job_object(experiment_id: str, runner_token: str, creator_role=None):
    """Function that creates the job object for the runner"""
    return build_runner_job(load_runner_template(), experiment_id, runner_token, creator_role)


def create_job(api_instance, job):
    """Function that creates the job for the runner"""
    api_instance.create_namespaced_job(
        body=job,
        namespace=RUNNER_NAMESPACE)
