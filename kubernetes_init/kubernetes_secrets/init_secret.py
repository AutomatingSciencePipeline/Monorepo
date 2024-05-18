from os import path
import sys
sys.path.append('../kubernetes_init')
from kubernetes_helper import get_yaml_file_body, handle_kubernetes_namespace_setup, handle_kubernetes_namespace_cleanup, CORE_API

SECRET_FILE_PATH = "secret.yaml"

def setup_secret():
    """Function to either update or create secret"""
    file_path = path.join(path.dirname(__file__), SECRET_FILE_PATH)
    secret_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_setup(
        secret_body,
        CORE_API.read_namespaced_secret,
        CORE_API.patch_namespaced_secret,
        CORE_API.create_namespaced_secret,
        CORE_API.delete_namespaced_secret
    )

def cleanup_secret():
    file_path = path.join(path.dirname(__file__), SECRET_FILE_PATH)
    secret_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        secret_body,
        CORE_API.delete_namespaced_secret
    )
