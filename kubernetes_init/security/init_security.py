"""Sets up the identities, permissions and network policies that separate the GLADOS components"""
from os import path
import sys
sys.path.append('../kubernetes_init')
from kubernetes_helper import apply_yaml_documents, delete_yaml_documents, delete_cluster_object, delete_namespaced_object

# Applied in this order: accounts first, then the permissions that refer to them
SECURITY_FILE_NAMES = [
    "service-accounts.yaml",
    "rbac-backend.yaml",
    "rbac-frontend.yaml",
    "network-policies.yaml",
]

# Older versions gave these permissions to the namespace's default ServiceAccount, which every Pod
# (including runners executing user code) used. They are replaced by the per-component accounts.
LEGACY_CLUSTER_OBJECTS = [
    ("rbac.authorization.k8s.io/v1", "ClusterRoleBinding", "job-creator-binding"),
    ("rbac.authorization.k8s.io/v1", "ClusterRole", "job-creator"),
]
LEGACY_NAMESPACED_OBJECTS = [
    ("rbac.authorization.k8s.io/v1", "RoleBinding", "job-creator", "default"),
]


def _file_path(file_name):
    return path.join(path.dirname(__file__), file_name)


def setup_security():
    """Creates or updates the ServiceAccounts, RBAC rules and NetworkPolicies"""
    for file_name in SECURITY_FILE_NAMES:
        apply_yaml_documents(_file_path(file_name))


def cleanup_security():
    """Deletes everything setup_security created"""
    for file_name in reversed(SECURITY_FILE_NAMES):
        delete_yaml_documents(_file_path(file_name))


def cleanup_legacy_permissions():
    """Removes the permissions that used to be bound to the default ServiceAccount"""
    for api_version, kind, name in LEGACY_CLUSTER_OBJECTS:
        delete_cluster_object(api_version, kind, name)
    for api_version, kind, name, namespace in LEGACY_NAMESPACED_OBJECTS:
        delete_namespaced_object(api_version, kind, name, namespace)
