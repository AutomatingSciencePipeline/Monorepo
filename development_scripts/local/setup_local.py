import base64
import os
import subprocess
import sys
import pathlib
import threading
from time import sleep

def setup(args):
    if len(args) == 0:
        print("Please provide at least one of the following arguments: frontend, backend, runner, all")
        return
    
    if not pathlib.Path().resolve().name == "Monorepo":
        print("Please run this script from the root of the Monorepo")
        return
    
    print("Setting up local environment")
    
    # SET YOUR DOCKER HUB USERNAME HERE!
    docker_hub_username = "DOCKER_HUB_USERNAME"
    
    # SET KEYCLOAK INFO HERE!
    # Ask Riley how to set this up
    keycloak_url = "http://glados-w0.csse.rose-hulman.edu:8080/realms/master"
    keycloak_client_id = "CLIENT_ID"
    keycloak_client_secret = "CLIENT_SECRET"
    
    if "frontend" in args:
        print("Building and pushing frontend image")
        # open a terminal and run the following command
        os.system(f"docker build -t {docker_hub_username}/glados-frontend:main -f ./apps/frontend/frontend.Dockerfile ./apps/frontend")
        os.system(f"docker push {docker_hub_username}/glados-frontend:main")
        
    if "backend" in args:
        print("Building and pushing backend image")
        # open a terminal and run the following command
        os.system(f"docker build -t {docker_hub_username}/glados-backend:main -f ./apps/backend/backend.Dockerfile ./apps/backend")
        os.system(f"docker push {docker_hub_username}/glados-backend:main")
        
    if "runner" in args:
        print("Building and pushing runner image")
        # open a terminal and run the following command
        os.system(f"docker build -t {docker_hub_username}/glados-runner:main -f ./apps/runner/runner.Dockerfile ./apps/runner")
        os.system(f"docker push {docker_hub_username}/glados-runner:main")
        
    if "all" in args:
        print("Building and pushing all images")
        # open a terminal and run the following command
        os.system(f"docker build -t {docker_hub_username}/glados-frontend:main -f ./apps/frontend/frontend.Dockerfile ./apps/frontend")
        os.system(f"docker push {docker_hub_username}/glados-frontend:main")
        os.system(f"docker build -t {docker_hub_username}/glados-backend:main -f ./apps/backend/backend.Dockerfile ./apps/backend")
        os.system(f"docker push {docker_hub_username}/glados-backend:main")
        os.system(f"docker build -t {docker_hub_username}/glados-runner:main -f ./apps/runner/runner.Dockerfile ./apps/runner")
        os.system(f"docker push {docker_hub_username}/glados-runner:main")
    
    print("Setting up kubernetes")
    
    os.system("python3 kubernetes_init\\init.py --hard")
    
    # in a new thread we need to run the following command
    # minikube service glados-frontend --url
    # we then need to use that url to setup some secret stuff, and then redeploy while keeping that open
    
    def run_minikube_service():
        process = subprocess.Popen(["minikube", "service", "glados-frontend", "--url"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        for line in process.stdout: # type: ignore
            print(line)
            url = line.strip()
            port = url.split(":")[-1]
            
            # go into the kubernetes_init/secrets folder and then update the auth url line to be
            # http://localhost:<port>/api/auth
            # update the line with AUTH_URL
            # values are base64 encoded
            f = open("kubernetes_init/kubernetes_secrets/secret.yaml", "r")
            lines = f.readlines()
            f.close()
            
            for i in range(len(lines)):
                if "AUTH_URL" in lines[i]:
                    # base 64 encode the url
                    b64Url = base64.b64encode(f"http://localhost:{port}/api/auth".encode()).decode()
                    lines[i] = f"  AUTH_URL: {b64Url}\n"
                
                if "AUTH_REDIRECT_PROXY_URL" in lines[i]:
                    b64Url = base64.b64encode(f"http://localhost:{port}/api/auth".encode()).decode()
                    lines[i] = f"  AUTH_REDIRECT_PROXY_URL: {b64Url}\n"
                
                if "AUTH_KEYCLOAK_ISSUER" in lines[i]:
                    b64Url = base64.b64encode(keycloak_url.encode()).decode()
                    lines[i] = f"  AUTH_KEYCLOAK_ISSUER: {b64Url}\n"
                    
                if "AUTH_KEYCLOAK_ID" in lines[i]:
                    b64Id = base64.b64encode(keycloak_client_id.encode()).decode()
                    lines[i] = f"  AUTH_KEYCLOAK_ID: {b64Id}\n"
                
                if "AUTH_KEYCLOAK_SECRET" in lines[i]:
                    b64Secret = base64.b64encode(keycloak_client_secret.encode()).decode()
                    lines[i] = f"  AUTH_KEYCLOAK_SECRET: {b64Secret}\n"
                    
            # update the file
            f = open("kubernetes_init/kubernetes_secrets/secret.yaml", "w")
            f.writelines(lines)
            f.close()
            
            # apply the new secrets
            os.system("python3 kubernetes_init\\init.py --hard")
                
            print(f"Frontend is now running at: http://localhost:{port}")        
                
            break
    if "skip" in args:
            print("Skipping redeploy")
            print("Frontend is available where it was before...")
            return
    
    # try to delete the old service
    # do this so that the old minikube service dies
    os.system("kubectl delete svc glados-frontend")
    os.system("kubectl expose deployment glados-frontend --type LoadBalancer --port 80 --target-port 3000")
    
    # wait a second or two here
    sleep(5)
        
    thread = threading.Thread(target=run_minikube_service)
    thread.start()
    
    
    print("Setup complete")
    
        
    
if __name__ == "__main__":
    args = sys.argv[1:]
    setup(args)