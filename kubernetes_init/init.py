"""Module that initializes GLADOS using the Kubernetes Python Client"""
from sys import argv
from backend import init_backend
from frontend import init_frontend
from kubernetes_secrets import init_secret
from mongodb import init_mongodb

def clean_up():
    """Deletes all Kubernetes objects created"""
    print("Cleaning up: Deployments")
    print("- Frontend:")
    init_frontend.cleanup_deployment()
    print("- Backend")
    init_backend.cleanup_backend()
    # print("- MongoDB")
    # init_mongodb.cleanup_deployment()

    print("Cleaning up: Endpoints")
    if "--production" in argv[1:]:
        print("- Frontend")
        init_frontend.cleanup_service()
    print("- Backend")
    init_backend.cleanup_service()
    # print("- MongoDB")
    # init_mongodb.cleanup_service()

    print("Cleaning up: Secrets")
    init_secret.cleanup_secret()

    # print("Cleaning up: MongoDB Storage Class")
    # init_mongodb.cleanup_storage_class()

    # print("Cleaning up: MongoDB Persistent Volume")
    # init_mongodb.cleanup_persistent_volume()
    # init_mongodb.cleanup_persistent_volume_claim()

    print("Cleaning up: Backend Job Creation Cluster Permissions")
    init_backend.cleanup_cluster_role()
    init_backend.cleanup_role_binding()
    
def run_update():
    """Skips cleaning up the services"""
    print("Cleaning up: Deployments")
    print("- Frontend:")
    init_frontend.cleanup_deployment()
    print("- Backend")
    init_backend.cleanup_backend()
    
    print("Cleaning up: Secrets")
    init_secret.cleanup_secret()
    
    print("Setting up: Secrets")
    # TODO: Secrets are split between secret-env and .env. Fix this
    init_secret.setup_secret()
    
    print("Setting up: Deployments")
    print("- Frontend")
    init_frontend.setup_deployment()
    print("- Backend")
    init_backend.setup_deployment()

def set_up():
    print("Setting up: Backend Job Creation Cluster Permissions")
    init_backend.setup_cluster_role()
    init_backend.setup_role_binding()
    print("Setting up: Secrets")
    # TODO: Secrets are split between secret-env and .env. Fix this
    init_secret.setup_secret()

    print("Setting up: Deployments")
    print("- Frontend")
    init_frontend.setup_deployment()
    print("- Backend")
    init_backend.setup_deployment()
    # print("- MongoDB")
    # init_mongodb.setup_deployment()

    print("Setting up: Endpoints")
    if "--production" in argv[1:]:
        print("- Frontend")
        init_frontend.setup_service()
    print("- Backend")
    init_backend.setup_service()
    # print("- MongoDB")
    # init_mongodb.setup_service()

    # print("Setting up: MongoDB Storage Class")
    # init_mongodb.setup_storage_class()

    # print("Setting up: MongoDB Persistent Volume")
    # init_mongodb.setup_persistent_volume()
    # init_mongodb.setup_persistent_volume_claim()

def main():
    """Function that gets called when the file is ran"""
    if "--hard" in argv[1:]:
        clean_up()
    elif "--update" in argv[1:]:
        run_update()
        print("Done!")
        return
    
    set_up()

    print("Done!")

if __name__ == '__main__':
    main()
