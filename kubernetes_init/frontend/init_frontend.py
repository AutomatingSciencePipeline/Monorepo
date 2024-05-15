from os import path
import sys
sys.path.append('../kubernetes_init')
from kubernetes_helper import get_yaml_file_body, get_env_variable, handle_kubernetes_namespace_setup, handle_kubernetes_namespace_cleanup, API, CORE_API, DISCOVERY_API

DEPLOYMENT_FRONTEND_FILE_NAME = "deployment-frontend.yaml"
SERVICE_FRONTEND_FILE_NAME = "service-frontend.yaml"
ENDPOINT_SLICE_FRONTEND_FILE_NAME = "endpoint-slice-frontend.yaml"

def setup_deployment():
    """Function to either update or create the backend deployment"""
    file_path = path.join(path.dirname(__file__), DEPLOYMENT_FRONTEND_FILE_NAME)
    frontend_body = get_yaml_file_body(file_path)

    port = int(get_env_variable("FRONTEND_WEBSERVER_PORT"))
    frontend_body['spec']['template']['spec']['containers'][0]['ports'][0]['containerPort'] = port
    # frontend_body['spec']['template']['spec']['containers'][0]['ports'][0]['hostPort'] = port

    handle_kubernetes_namespace_setup(
        frontend_body,
        API.read_namespaced_deployment,
        API.patch_namespaced_deployment,
        API.create_namespaced_deployment,
        API.delete_namespaced_deployment
    )

def cleanup_deployment():
    """Function to either update or create the backend deployment"""
    file_path = path.join(path.dirname(__file__), DEPLOYMENT_FRONTEND_FILE_NAME)
    frontend_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        frontend_body,
        API.delete_namespaced_deployment
    )

def setup_service():
    file_path = path.join(path.dirname(__file__), SERVICE_FRONTEND_FILE_NAME)
    service_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_setup(
        service_body,
        CORE_API.read_namespaced_service,
        CORE_API.patch_namespaced_service,
        CORE_API.create_namespaced_service,
        CORE_API.delete_namespaced_service
    )

def cleanup_service():
    file_path = path.join(path.dirname(__file__), SERVICE_FRONTEND_FILE_NAME)
    service_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        service_body,
        CORE_API.delete_namespaced_service
    )

def setup_endpoint_slice():
    file_path = path.join(path.dirname(__file__), ENDPOINT_SLICE_FRONTEND_FILE_NAME)
    endpoint_slice_body = get_yaml_file_body(file_path)

    port = int(get_env_variable("FRONTEND_WEBSERVER_PORT"))
    ipv4 = get_env_variable("FRONTEND_WEBSERVER_IPV4")

    endpoint_slice_body['ports'][0]['port'] = port
    endpoint_slice_body['endpoints'][0]['addresses'][0] = ipv4

    handle_kubernetes_namespace_setup(
        endpoint_slice_body,
        DISCOVERY_API.read_namespaced_endpoint_slice,
        DISCOVERY_API.patch_namespaced_endpoint_slice,
        DISCOVERY_API.create_namespaced_endpoint_slice,
        DISCOVERY_API.delete_namespaced_endpoint_slice
    )