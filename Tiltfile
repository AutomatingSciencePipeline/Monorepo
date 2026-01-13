# load the helm_resource extension
v1alpha1.extension_repo(name='default', url='https://github.com/tilt-dev/tilt-extensions')
v1alpha1.extension(name='helm_resource', repo_name='default', repo_path='helm_resource')
load("ext://helm_resource", "helm_resource")

# Setup the needed k8s yamls
k8s_yaml([
    "kubernetes_init/tilt/cluster-role-job-creator.yaml",
    "kubernetes_init/tilt/role-binding-job-creator.yaml",
    "kubernetes_init/kubernetes_secrets/secret.yaml",
    "kubernetes_init/tilt/deployment-frontend.yaml",
    "kubernetes_init/tilt/service-frontend.yaml",
    "kubernetes_init/tilt/deployment-backend.yaml",
    "kubernetes_init/tilt/service-backend-dev.yaml",
    "helm_packages/mongodb-helm/pvs.yaml",
    "kubernetes_init/tilt/job-resource-quota.yaml"
])

# Setup the folder paths inside minikube
local_resource("fix-minikube-folder-perms-setup-data", 
    cmd="minikube ssh -- sudo mkdir -p /srv/data", 
    labels=["fix-minikube-folder-perms"]
)
# mongo-1
local_resource("fix-minikube-folder-perms-setup-mongo-1", 
    cmd="minikube ssh -- sudo mkdir -p /srv/data/mongo-1", 
    labels=["fix-minikube-folder-perms"]
)
local_resource("fix-minikube-folder-perms-mongo-1-perms", 
    cmd="minikube ssh -- sudo chown -R 1001:1001 /srv/data/mongo-1", 
    labels=["fix-minikube-folder-perms"]
)
# mongo-2
local_resource("fix-minikube-folder-perms-setup-mongo-2",
    cmd="minikube ssh -- sudo mkdir -p /srv/data/mongo-2", 
    labels=["fix-minikube-folder-perms"]
)
local_resource("fix-minikube-folder-perms-mongo-2-perms", 
    cmd="minikube ssh -- sudo chown -R 1001:1001 /srv/data/mongo-2", 
    labels=["fix-minikube-folder-perms"]
)

# setup the mongodb helm chart
helm_resource(
    name="glados-mongodb",
    chart="oci://registry-1.docker.io/bitnamicharts/mongodb",
    flags=["--values=./helm_packages/mongodb-helm/tilt/values.yaml"],
    labels=["mongodb"],
    port_forwards=["30000"]
)

# Setup the k8s_resource
k8s_resource("glados-frontend", port_forwards="3000", labels=["frontend"])
k8s_resource("glados-backend", port_forwards="5050", labels=["backend"])

# Build the frontend
docker_build("frontend", 
    context='./apps/frontend/',
    live_update=[
        sync("./apps/frontend/", "/usr/src/app")
    ],
    dockerfile='./apps/frontend/frontend-dev.Dockerfile')

# Build the backend
docker_build("backend", 
    context='./apps/backend/', 
    live_update=[
        sync("./apps/backend/", "/app"),
        run('cd /app && pip install -r requirements.txt',
            trigger='./requirements.txt'),
        
    ],
    dockerfile='./apps/backend/backend-dev.Dockerfile')

# Build the runner
docker_build("runner", 
    context='./apps/runner', 
    dockerfile='./apps/runner/runner.Dockerfile',
    match_in_env_vars=True)

# add a command that will run on tilt down to cleanup the pv's that are made by helm
if config.tilt_subcommand == 'down':
    local("helm uninstall glados-mongodb")
    local("kubectl delete pvc --all")