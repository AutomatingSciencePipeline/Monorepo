from kubernetes import client
import time
import json
import zipfile
import io

def wait_for_pod_ready(api, name, namespace, timeout=120):
    """Wait until pod is Ready using conditions"""
    start = time.time()
    while True:
        pod = api.read_namespaced_pod(name=name, namespace=namespace)
        conditions = pod.status.conditions or []
        for cond in conditions:
            if cond.type == "Ready" and cond.status == "True":
                print(f"Pod {name} is ready.")
                return
        
        if time.time() - start > timeout:
            raise TimeoutError(f"Pod {name} did not become ready in time.")
        
        print(f"Waiting for pod {name} to become ready...")
        time.sleep(1)


def upload_payload_to_pod(api, pod_name, namespace, zip_bytes):
    """Upload ZIP payload to pod via Kubernetes API proxy"""
    resp = api.connect_post_namespaced_pod_proxy_with_path(
        name=pod_name,
        namespace=namespace,
        port=8080,
        path="upload",
        body=zip_bytes,
        headers={"Content-Type": "application/zip"},
        _preload_content=False,
    )
    result = resp.read()
    print(f"Upload response: {result}")
    return result


def create_zip_payload(experiment_data):
    """Create ZIP payload from experiment data"""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
        zip_file.writestr('experiment.json', json.dumps(experiment_data))
        if 'code' in experiment_data:
            zip_file.writestr('code.py', experiment_data['code'])
    return zip_buffer.getvalue()


def create_and_upload_job(core_api, experiment_data):
    """Create pod, wait for ready, and upload payload"""
    namespace = "default"
    job_name = f"worker-job-{int(time.time())}"
    
    # 1. Create the pod
    pod_spec = client.V1Pod(
        metadata=client.V1ObjectMeta(
            name=job_name,
            labels={"app": "worker-job"},
        ),
        spec=client.V1PodSpec(
            containers=[
                client.V1Container(
                    name="worker",
                    image="myimage:latest",  # Update with your actual image
                    ports=[client.V1ContainerPort(container_port=8080)],
                    readiness_probe=client.V1Probe(
                        http_get=client.V1HTTPGetAction(
                            path="/health",
                            port=8080
                        ),
                        initial_delay_seconds=1,
                        period_seconds=1
                    )
                )
            ],
            restart_policy="Never",
        )
    )
    
    core_api.create_namespaced_pod(namespace=namespace, body=pod_spec)
    print(f"Pod {job_name} created.")
    
    # 2. Wait for pod to be ready
    wait_for_pod_ready(core_api, job_name, namespace)
    
    # 3. Create and upload ZIP payload
    zip_bytes = create_zip_payload(experiment_data)
    upload_payload_to_pod(core_api, job_name, namespace, zip_bytes)
    
    return job_name