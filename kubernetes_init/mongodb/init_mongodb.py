from os import path
import sys
sys.path.append('../kubernetes_init')
from kubernetes_helper import get_yaml_file_body, get_env_variable, handle_kubernetes_namespace_setup, handle_kubernetes_namespace_cleanup, handle_kubernetes_cleanup, handle_kubernetes_setup, STORAGE_API, CORE_API, DISCOVERY_API, API

DEPLOYMENT_MONGODB_FILE_NAME = "deployment-mongodb.yaml"
SERVICE_MONGODB_FILE_NAME = "service-mongodb.yaml"
ENDPOINT_SLICE_MONGODB_FILE_NAME = "endpoint-slice-mongodb.yaml"
PERSISTENT_VOLUME_MONGODB_FILE_NAME = "pv-mongodb.yaml"
PERSISTENT_VOLUME_CLAIM_MONGODB_FILE_NAME = "pvc-mongodb.yaml"
STORAGE_CLASS_MONGODB_FILE_NAME = "storage-class-mongodb.yaml"

def setup_deployment():
    """Function to either update or create the mongodb deployment"""
    file_path = path.join(path.dirname(__file__), DEPLOYMENT_MONGODB_FILE_NAME)
    mongodb_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_setup(
        mongodb_body,
        API.read_namespaced_deployment,
        API.patch_namespaced_deployment,
        API.create_namespaced_deployment,
        API.delete_namespaced_deployment
    )

def cleanup_deployment():
    """Function to clean up the mongodb deployment"""
    file_path = path.join(path.dirname(__file__), DEPLOYMENT_MONGODB_FILE_NAME)
    mongodb_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        mongodb_body,
        API.delete_namespaced_deployment
    )

def setup_service():
    file_path = path.join(path.dirname(__file__), SERVICE_MONGODB_FILE_NAME)
    mongo_service_body = get_yaml_file_body(file_path)

    mongodb_port = int(get_env_variable("MONGODB_PORT"))

    mongo_service_body["spec"]["ports"][0]["port"] = mongodb_port
    mongo_service_body["spec"]["ports"][0]["targetPort"] = mongodb_port

    handle_kubernetes_namespace_setup(
        mongo_service_body,
        CORE_API.read_namespaced_service,
        CORE_API.patch_namespaced_service,
        CORE_API.create_namespaced_service,
        CORE_API.delete_namespaced_service
    )

def cleanup_service():
    file_path = path.join(path.dirname(__file__), SERVICE_MONGODB_FILE_NAME)
    mongo_service_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        mongo_service_body,
        CORE_API.delete_namespaced_service
    )

def setup_endpoint_slice():
    file_path = path.join(path.dirname(__file__), ENDPOINT_SLICE_MONGODB_FILE_NAME)
    endpointslice_body = get_yaml_file_body(file_path)

    mongodb_port = int(get_env_variable("MONGODB_PORT"))
    mongodb_ipv4 = get_env_variable("MONGODB_IPV4")

    endpointslice_body['ports'][0]['port'] = mongodb_port
    endpointslice_body['endpoints'][0]['addresses'][0] = mongodb_ipv4

    handle_kubernetes_namespace_setup(
        endpointslice_body,
        DISCOVERY_API.read_namespaced_endpoint_slice,
        DISCOVERY_API.patch_namespaced_endpoint_slice,
        DISCOVERY_API.create_namespaced_endpoint_slice,
        DISCOVERY_API.delete_namespaced_endpoint_slice
    )

def cleanup_endpoint_slice():
    file_path = path.join(path.dirname(__file__), ENDPOINT_SLICE_MONGODB_FILE_NAME)
    endpointslice_body = get_yaml_file_body(file_path)

    handle_kubernetes_namespace_cleanup(
        endpointslice_body,
        DISCOVERY_API.delete_namespaced_endpoint_slice
    )

def setup_storage_class():
    file_path = path.join(path.dirname(__file__), STORAGE_CLASS_MONGODB_FILE_NAME)
    storage_class_body = get_yaml_file_body(file_path)
    
    handle_kubernetes_setup(
        storage_class_body,
        STORAGE_API.read_storage_class,
        STORAGE_API.patch_storage_class,
        STORAGE_API.create_storage_class,
        STORAGE_API.delete_storage_class
    )

def cleanup_storage_class():
    file_path = path.join(path.dirname(__file__), STORAGE_CLASS_MONGODB_FILE_NAME)
    storage_class_body = get_yaml_file_body(file_path)
    
    handle_kubernetes_cleanup(
        storage_class_body,
        STORAGE_API.delete_storage_class
    )
    
def setup_persistent_volume():
    file_path = path.join(path.dirname(__file__), PERSISTENT_VOLUME_MONGODB_FILE_NAME)
    persistent_volume_body = get_yaml_file_body(file_path)
    
    handle_kubernetes_setup(
        persistent_volume_body,
        CORE_API.read_persistent_volume,
        CORE_API.patch_persistent_volume,
        CORE_API.create_persistent_volume,
        CORE_API.delete_persistent_volume
    )

def cleanup_persistent_volume():
    file_path = path.join(path.dirname(__file__), PERSISTENT_VOLUME_MONGODB_FILE_NAME)
    persistent_volume_body = get_yaml_file_body(file_path)
    
    handle_kubernetes_cleanup(
        persistent_volume_body,
        CORE_API.delete_persistent_volume
    )
    
def setup_persistent_volume_claim():
    file_path = path.join(path.dirname(__file__), PERSISTENT_VOLUME_CLAIM_MONGODB_FILE_NAME)
    persistent_volume_claim_body = get_yaml_file_body(file_path)
    
    handle_kubernetes_namespace_setup(
        persistent_volume_claim_body,
        CORE_API.read_namespaced_persistent_volume_claim,
        CORE_API.patch_namespaced_persistent_volume_claim,
        CORE_API.create_namespaced_persistent_volume_claim,
        CORE_API.delete_namespaced_persistent_volume_claim
    )

def cleanup_persistent_volume_claim():
    file_path = path.join(path.dirname(__file__), PERSISTENT_VOLUME_CLAIM_MONGODB_FILE_NAME)
    persistent_volume_claim_body = get_yaml_file_body(file_path)
    
    handle_kubernetes_namespace_cleanup(
        persistent_volume_claim_body,
        CORE_API.delete_namespaced_persistent_volume_claim
    )
