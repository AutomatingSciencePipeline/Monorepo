
from os import path
import sys
sys.path.append('../kubernetes_init')
from kubernetes_helper import get_yaml_file_body, get_env_variable, handle_kubernetes_namespace_setup, handle_kubernetes_setup, handle_kubernetes_namespace_cleanup, handle_kubernetes_cleanup, API, RBAC_AUTH_API, CORE_API, DISCOVERY_API

DEPLOYMENT_BACKEND_FILE_NAME = "deployment-backend.yaml"
SERVICE_BACKEND_FILE_NAME = "service-backend.yaml"
ENDPOINT_SLICE_BACKEND_FILE_NAME = "endpoint-slice-backend.yaml"
CLUSTER_ROLE_FILE_NAME = "cluster-role-job-creator.yaml"
ROLE_BINDING_FILE_NAME = "role-binding-job-creator.yaml"

def setup_deployment():
    """Function to either update or create the backend deployment"""
    file_path = path.join(path.dirname(__file__), DEPLOYMENT_BACKEND_FILE_NAME)
    backend_body = get_yaml_file_body(file_path)

    port = int(get_env_variable("BACKEND_PORT"))
    backend_body['spec']['template']['spec']['containers'][0]['ports'][0]['containerPort'] = port
    # backend_body['spec']['template']['spec']['containers'][0]['ports'][0]['hostPort'] = port

    handle_kubernetes_namespace_setup(
        backend_body,
        API.read_namespaced_deployment,
        API.patch_namespaced_deployment,
        API.create_namespaced_deployment,
        API.delete_namespaced_deployment
    )

def cleanup_backend():
    file_path = path.join(path.dirname(__file__), DEPLOYMENT_BACKEND_FILE_NAME)
    backend_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        backend_body,
        API.delete_namespaced_deployment
    )


def setup_service():
    file_path = path.join(path.dirname(__file__), SERVICE_BACKEND_FILE_NAME)
    service_body = get_yaml_file_body(file_path)

    port = int(get_env_variable("BACKEND_PORT"))

    service_body["spec"]["ports"][0]["port"] = port
    service_body["spec"]["ports"][0]["targetPort"] = port

    handle_kubernetes_namespace_setup(
        service_body,
        CORE_API.read_namespaced_service,
        CORE_API.patch_namespaced_service,
        CORE_API.create_namespaced_service,
        CORE_API.delete_namespaced_service
    )

def cleanup_service():
    file_path = path.join(path.dirname(__file__), SERVICE_BACKEND_FILE_NAME)
    service_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        service_body,
        CORE_API.delete_namespaced_service
    )
    
def setup_endpoint_slice():
    file_path = path.join(path.dirname(__file__), ENDPOINT_SLICE_BACKEND_FILE_NAME)
    endpoint_slice_body = get_yaml_file_body(file_path)

    port = int(get_env_variable("BACKEND_PORT"))
    ipv4 = get_env_variable("BACKEND_IPV4")

    endpoint_slice_body['ports'][0]['port'] = port
    endpoint_slice_body['endpoints'][0]['addresses'][0] = ipv4

    handle_kubernetes_namespace_setup(
        endpoint_slice_body,
        DISCOVERY_API.read_namespaced_endpoint_slice,
        DISCOVERY_API.patch_namespaced_endpoint_slice,
        DISCOVERY_API.create_namespaced_endpoint_slice,
        DISCOVERY_API.delete_namespaced_endpoint_slice
    )

def cleanup_endpoint_slice():
    file_path = path.join(path.dirname(__file__), ENDPOINT_SLICE_BACKEND_FILE_NAME)
    endpoint_slice_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        endpoint_slice_body,
        DISCOVERY_API.delete_namespaced_endpoint_slice
    )

def setup_cluster_role():
    file_path = path.join(path.dirname(__file__), CLUSTER_ROLE_FILE_NAME)
    cluster_role_body = get_yaml_file_body(file_path)
    handle_kubernetes_setup(
        cluster_role_body,
        RBAC_AUTH_API.read_cluster_role,
        RBAC_AUTH_API.patch_cluster_role,
        RBAC_AUTH_API.create_cluster_role,
        RBAC_AUTH_API.delete_cluster_role
    )

def cleanup_cluster_role():
    file_path = path.join(path.dirname(__file__), CLUSTER_ROLE_FILE_NAME)
    cluster_role_body = get_yaml_file_body(file_path)

    handle_kubernetes_cleanup(
        cluster_role_body,
        RBAC_AUTH_API.delete_cluster_role
    )

def setup_role_binding():
    file_path = path.join(path.dirname(__file__), ROLE_BINDING_FILE_NAME)
    role_binding_body = get_yaml_file_body(file_path)
    handle_kubernetes_namespace_setup(
        role_binding_body,
        RBAC_AUTH_API.read_namespaced_role_binding,
        RBAC_AUTH_API.patch_namespaced_role_binding,
        RBAC_AUTH_API.create_namespaced_role_binding,
        RBAC_AUTH_API.delete_namespaced_role_binding
    )

def cleanup_role_binding():
    file_path = path.join(path.dirname(__file__), ROLE_BINDING_FILE_NAME)
    role_binding_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        role_binding_body,
        RBAC_AUTH_API.delete_namespaced_role_binding
    )
