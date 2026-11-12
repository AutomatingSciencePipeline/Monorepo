"""Builds the Kubernetes Job that runs an experiment.

This module has no Kubernetes client dependency so the resulting manifest can be unit tested.
"""
import copy
import json
import os
from typing import Mapping, Optional

import yaml

RUNNER_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "job-runner.yaml")

# Experiments created by these roles may install system packages (packages.txt / commandsToRun.txt),
# which needs root inside the container
PRIVILEGED_ROLES = ("admin", "privileged")

# Extra time a runner token stays valid after the Job deadline, so final uploads are not cut off
TOKEN_GRACE_SECONDS = 3600

# Backend environment variables that override the defaults in job-runner.yaml
RESOURCE_ENV_OVERRIDES = {
    "RUNNER_CPU_REQUEST": ("requests", "cpu"),
    "RUNNER_MEMORY_REQUEST": ("requests", "memory"),
    "RUNNER_CPU_LIMIT": ("limits", "cpu"),
    "RUNNER_MEMORY_LIMIT": ("limits", "memory"),
    "RUNNER_EPHEMERAL_STORAGE_LIMIT": ("limits", "ephemeral-storage"),
}
DEADLINE_ENV = "RUNNER_ACTIVE_DEADLINE_SECONDS"


def get_yaml_file_body(file_path):
    """Function to get yaml file from body"""
    with open(file_path, encoding="utf-8") as yaml_file:
        return yaml.safe_load(yaml_file)


def load_runner_template():
    return get_yaml_file_body(RUNNER_PATH)


def active_deadline_seconds(template: dict, env: Optional[Mapping[str, str]] = None) -> int:
    """How long a runner Job may live, from the backend environment or the template default"""
    env = os.environ if env is None else env
    override = env.get(DEADLINE_ENV)
    if override:
        seconds = int(override)
        if seconds <= 0:
            raise ValueError(f"{DEADLINE_ENV} must be a positive number of seconds")
        return seconds
    return int(template['spec']['activeDeadlineSeconds'])


def token_ttl_seconds(template: dict, env: Optional[Mapping[str, str]] = None) -> int:
    return active_deadline_seconds(template, env) + TOKEN_GRACE_SECONDS


def is_privileged_role(creator_role) -> bool:
    return creator_role in PRIVILEGED_ROLES


def build_runner_job(template: dict, experiment_id: str, runner_token: str, creator_role=None,
                     env: Optional[Mapping[str, str]] = None) -> dict:
    """Returns the Job manifest for one experiment.

    The runner is told only the experiment id. Everything else is fetched from the backend with the
    experiment-scoped token, so a caller cannot smuggle extra data into the Pod.
    """
    env = os.environ if env is None else env
    job = copy.deepcopy(template)
    pod_spec = job['spec']['template']['spec']
    container = pod_spec['containers'][0]

    job['metadata']['name'] = "runner-" + experiment_id
    job['spec']['activeDeadlineSeconds'] = active_deadline_seconds(template, env)
    container['command'] = ["python3", "runner.py", json.dumps({"experiment": {"id": experiment_id}})]
    container.setdefault('env', []).append({"name": "RUNNER_TOKEN", "value": runner_token})

    image_name = env.get("IMAGE_RUNNER")
    if image_name:
        container['image'] = str(image_name)
        # The dev image is built locally by Tilt and doesn't exist in a registry, so don't try to pull it
        container['imagePullPolicy'] = "IfNotPresent"

    for env_name, (kind, resource) in RESOURCE_ENV_OVERRIDES.items():
        value = env.get(env_name)
        if value:
            container['resources'][kind][resource] = str(value)

    if is_privileged_role(creator_role):
        _apply_privileged_profile(pod_spec, container)

    return job


def _apply_privileged_profile(pod_spec: dict, container: dict) -> None:
    """Admin and privileged users may run apt-get, so their runner needs root and a writable filesystem.

    Everything else stays in place: no API token, no privilege escalation, the default seccomp
    profile, the same resource limits and the same network restrictions.
    """
    pod_spec['securityContext'] = {"seccompProfile": {"type": "RuntimeDefault"}, "runAsUser": 0, "runAsGroup": 0}
    container['securityContext'] = {"allowPrivilegeEscalation": False, "readOnlyRootFilesystem": False}
    for entry in container.get('env', []):
        if entry['name'] == "HOME":
            entry['value'] = "/root"
    # Root writes to the container filesystem directly, the scratch volumes are only for the read-only profile
    container['volumeMounts'] = [mount for mount in container.get('volumeMounts', []) if mount['name'] != "home"]
    pod_spec['volumes'] = [volume for volume in pod_spec.get('volumes', []) if volume['name'] != "home"]
