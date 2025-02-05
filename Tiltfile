# Setup the needed k8s yamls
k8s_yaml([
    "kubernetes_init/tilt/cluster-role-job-creator.yaml",
    "kubernetes_init/tilt/role-binding-job-creator.yaml",
    "kubernetes_init/kubernetes_secrets/secret.yaml",
    "kubernetes_init/tilt/deployment-frontend.yaml",
    "kubernetes_init/tilt/service-frontend.yaml",
    "kubernetes_init/tilt/deployment-backend.yaml",
    "kubernetes_init/tilt/service-backend-dev.yaml",
    "kubernetes_init/tilt/watch-runner-cronjob.yaml",
])

# Setup the k8s_resource
k8s_resource("glados-frontend", port_forwards="3000", labels=["frontend"])
k8s_resource("glados-backend", port_forwards="5050", labels=["backend"])
k8s_resource("watch-runner-changes", labels=["runner"])

# Build the frontend
docker_build("frontend", 
    context='./apps/frontend',
    live_update=[
        sync("./apps/frontend", "/usr/src/app")
    ],
    dockerfile='./apps/frontend/frontend-dev.Dockerfile')

# Build the backend
docker_build("backend", 
    context='./apps/backend', 
    live_update=[
        sync("./apps/backend", "/app"),
        run('cd /app && pip install -r requirements.txt',
            trigger='./requirements.txt'),
        
    ],
    dockerfile='./apps/backend/backend-dev.Dockerfile')

# Build the runner
docker_build("runner", 
    context='./apps/runner', 
    dockerfile='./apps/runner/runner.Dockerfile',
    match_in_env_vars=True)

# Ignore the runner not being used
update_settings(suppress_unused_image_warnings=["runner"])