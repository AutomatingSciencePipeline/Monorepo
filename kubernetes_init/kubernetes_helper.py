"""Module that includes features to help with interacting with the Kubernetes Python Client"""
from os import environ, path, getcwd
import sys
import yaml
from kubernetes import client, config, dynamic
from dotenv import load_dotenv
# from init import should_force_update

config.load_kube_config()
load_dotenv(path.join(getcwd(), ".env"))

API = client.AppsV1Api()
CORE_API = client.CoreV1Api()
DISCOVERY_API = client.DiscoveryV1Api()
STORAGE_API = client.StorageV1Api()
RBAC_AUTH_API = client.RbacAuthorizationV1Api()
DYNAMIC_API = dynamic.DynamicClient(client.ApiClient())

def get_env_variable(variable_name):
    """Returns the value of the environment variable"""
    return environ.get(variable_name)

def handle_kubernetes_namespace_setup(object_body, function_read_namespaced, function_patch_namespaced, function_create_namespaced, function_delete_namespaced):
    """Function to either update or create a kubernetes namespaced object"""
    name = object_body['metadata']['name']

    namespace = 'default'
    try:
        namespace = object_body['metadata']['namespace']
    except KeyError:
        print("WARNING: " + name + " does not have a namespace assigned")
        print("-> Assuming 'default' namespace")

    try:
        function_read_namespaced(name=name, namespace=namespace)
    except client.exceptions.ApiException:
        print ("- Creating: " + name)
        function_create_namespaced(namespace=namespace, body=object_body)
        return
    print ("- Updating: " + name)
    if should_force_update():
        function_create_namespaced(namespace=namespace, body=object_body)
        return
    function_patch_namespaced(namespace=namespace, name=name, body=object_body)

def handle_kubernetes_setup(object_body, function_read, function_patch, function_create, function_delete):
    name = object_body['metadata']['name']

    try:
        function_read(name=name)
    except client.exceptions.ApiException:
        print ("- Creating: " + name)
        function_create(body=object_body)
        return
    print ("- Updating: " + name)
    if should_force_update():
        function_create(body=object_body)
        return
    function_patch(name=name, body=object_body)

def handle_kubernetes_namespace_cleanup(object_body, function_delete):
    name = object_body['metadata']['name']
    namespace = 'default'
    try:
        namespace = object_body['metadata']['namespace']
    except KeyError:
        print("WARNING: " + name + " does not have a namespace assigned")
        print("-> Assuming 'default' namespace")

    try:
        function_delete(namespace=namespace, name=name)
    except client.exceptions.ApiException:
        return

def handle_kubernetes_cleanup(object_body, function_delete):
    name = object_body['metadata']['name']

    try:
        function_delete(name=name)
    except client.exceptions.ApiException:
        return

def should_force_update():
    return "--hard" in sys.argv[1:]

def get_yaml_file_body(file_path):
    """Function to get yaml file from body"""
    body = None
    with open(file_path, encoding="utf-8") as yaml_file:
        body = yaml.safe_load(yaml_file)
    return body

def get_yaml_file_documents(file_path):
    """Returns every document of a yaml file that may hold several, separated by ---"""
    with open(file_path, encoding="utf-8") as yaml_file:
        return [document for document in yaml.safe_load_all(yaml_file) if document]

def apply_yaml_documents(file_path):
    """Creates or updates every Kubernetes object in a yaml file, whatever its kind"""
    for document in get_yaml_file_documents(file_path):
        resource = DYNAMIC_API.resources.get(api_version=document['apiVersion'], kind=document['kind'])
        name = document['metadata']['name']
        namespace = document['metadata'].get('namespace') if resource.namespaced else None
        try:
            resource.get(name=name, namespace=namespace)
        except client.exceptions.ApiException as err:
            if err.status != 404:
                raise
            print("- Creating: " + document['kind'] + " " + name)
            resource.create(body=document, namespace=namespace)
            continue
        print("- Updating: " + document['kind'] + " " + name)
        # A merge patch replaces lists such as RBAC rules as a whole, so removed rules really go away
        resource.patch(body=document, name=name, namespace=namespace, content_type="application/merge-patch+json")

def delete_yaml_documents(file_path):
    """Deletes every Kubernetes object in a yaml file, ignoring the ones that are already gone"""
    for document in get_yaml_file_documents(file_path):
        namespace = document['metadata'].get('namespace')
        if namespace:
            delete_namespaced_object(document['apiVersion'], document['kind'], document['metadata']['name'], namespace)
        else:
            delete_cluster_object(document['apiVersion'], document['kind'], document['metadata']['name'])

def delete_cluster_object(api_version, kind, name):
    _delete_object(api_version, kind, name, None)

def delete_namespaced_object(api_version, kind, name, namespace):
    _delete_object(api_version, kind, name, namespace)

def _delete_object(api_version, kind, name, namespace):
    resource = DYNAMIC_API.resources.get(api_version=api_version, kind=kind)
    try:
        resource.delete(name=name, namespace=namespace if resource.namespaced else None)
        print("- Deleted: " + kind + " " + name)
    except client.exceptions.ApiException as err:
        if err.status != 404:
            raise
