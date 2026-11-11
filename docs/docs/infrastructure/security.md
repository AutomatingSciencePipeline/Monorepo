# Security Boundaries

GLADOS runs code that users upload. That code must be treated as untrusted: it should be able to compute and report its own results, and nothing else. This page describes the boundary between user code and the rest of GLADOS, how it is enforced, and how to check it.

## Who may do what

| Component | Kubernetes identity | Kubernetes permissions | Secrets it receives |
|-----------|--------------------|------------------------|---------------------|
| Frontend | `glados-frontend` | List Pods and read Pod logs in `default` (live log viewer). Patch the `glados-frontend` and `glados-backend` Deployments, list nodes and patch node `glados-w0` (admin "redeploy" button). | Database login, Auth.js and OAuth settings |
| Backend | `glados-backend` | Create and delete Jobs in `default`. Create TokenReviews (to check who is calling it). | Database login, `GMAIL_CREDS` |
| Runner (user code) | `glados-runner` | None. No API token is mounted in the Pod. | `BACKEND_PORT` only, plus a token for its own experiment |

Nothing is bound to the namespace's `default` ServiceAccount.

The manifests live in `kubernetes_init/security/`. Both Tilt and `kubernetes_init/init.py` apply them.

## How a runner is contained

The backend builds every runner Job from `apps/backend/job-runner.yaml` (see `apps/backend/modules/runner_job.py`).

- **No Kubernetes access.** The Pod uses the `glados-runner` ServiceAccount, which has no permissions, and `automountServiceAccountToken: false`.
- **No shared credentials.** The Pod gets no database login and no mail credentials. The backend sends the "experiment finished" email itself, to the address stored on the experiment.
- **Non-root, read-only.** The container runs as user `10001` with all capabilities dropped, no privilege escalation, the default seccomp profile and a read-only root filesystem. It can write to four scratch volumes: `/app/ExperimentFiles`, `/app/logs`, `/home/runner` (pip installs go here) and `/tmp`.
- **Resource limits.** See [Limits](#limits).
- **Checked archives.** Uploaded zip files are rejected if an entry points outside the experiment folder or if the archive is unreasonably large (`apps/runner/modules/archive.py`).

### Admin and privileged users

Experiments whose creator has the role `admin` or `privileged` may install system packages (`packages.txt`) and run setup commands (`commandsToRun.txt`). `apt-get` needs root, so these runners start as root with a writable filesystem. Everything else above still applies: no API token, no credentials, no privilege escalation, the same limits.

The backend reads the role from the database when it creates the Job. The frontend stores the role from the signed-in session, not from the request.

## How the backend knows who is calling

Every backend endpoint except the health checks (`/` and `/mongoPulse`) requires a token.

| Endpoints | Caller | Proof |
|-----------|--------|-------|
| `/experiment`, `/cancelExperiment`, `/queue` | Frontend | A Kubernetes ServiceAccount token with audience `glados-backend`. Kubernetes mounts it into the frontend Pod at `/var/run/secrets/glados/backend/token` and rotates it. The backend checks it with the TokenReview API and only accepts `system:serviceaccount:default:glados-frontend`. |
| `/getExperiment`, `/downloadExpFile`, `/updateExperiment`, `/uploadResults`, `/uploadZip`, `/uploadLog`, `/sendExperimentEmail`, `/runnerFinished` | Runner | A random token the backend creates for that one Job. |

A runner token:

- only works for the experiment it was created for. A runner cannot read, change or upload results for any other experiment.
- can only change the progress fields `status`, `finished`, `passes`, `fails`, `totalExperimentRuns`, `startedAtEpochMillis` and `finishedAtEpochMilliseconds`.
- stops working when the runner finishes, when the experiment is cancelled, or one hour after the Job deadline, whichever comes first.
- is stored in MongoDB only as a hash (collection `runnerTokens`).

User code runs in the same container as the runner, so it can read the runner's token. That is why the token is scoped this tightly: with it, user code can only affect the experiment it already controls.

The backend settings `CONTROL_PLANE_ALLOWED_SUBJECTS` (comma separated) and `BACKEND_TOKEN_AUDIENCE` change who is accepted. The defaults match the manifests.

## Limits

| Safeguard | Default | Backend environment variable |
|-----------|---------|------------------------------|
| CPU request / limit | 250m / 4 | `RUNNER_CPU_REQUEST`, `RUNNER_CPU_LIMIT` |
| Memory request / limit | 256Mi / 8Gi | `RUNNER_MEMORY_REQUEST`, `RUNNER_MEMORY_LIMIT` |
| Disk (container and scratch volumes) | 20Gi | `RUNNER_EPHEMERAL_STORAGE_LIMIT` |
| Lifetime of a runner Job | 7 days | `RUNNER_ACTIVE_DEADLINE_SECONDS` |
| Time per trial | Set per experiment (`timeout`) | |
| Zip entries / unpacked size | 100000 / 8 GiB | `RUNNER_MAX_ARCHIVE_MEMBERS`, `RUNNER_MAX_ARCHIVE_BYTES` (runner image) |

A runner that exceeds its memory limit is killed, one that exceeds its disk limit is evicted, and one that outlives the deadline is stopped. Set the variables on the backend Deployment to change the values for a cluster.

## Network

`kubernetes_init/security/network-policies.yaml` describes the intended network boundary:

- Runner Pods accept no incoming connections. They may reach DNS, the backend and the public internet (for `pip install` and datasets), but no private address ranges. That keeps them away from MongoDB, the Kubernetes API, other Pods and the nodes.
- The backend only accepts connections from frontend and runner Pods.

!!! warning

    NetworkPolicies only work if the cluster's network plugin enforces them. **Flannel, which the production cluster uses, does not, and neither does minikube's default network.** Until an enforcing plugin (for example Calico or Cilium) is installed, these policies have no effect, and the token checks described above are the boundary that holds.

    If the nodes have addresses outside the private ranges listed in the policy, add the node network to the `except` list.

## MongoDB

- The production chart values (`helm_packages/mongodb-helm/values.yaml`) no longer contain a password. `deploy.sh` creates the Secret `glados-mongodb-auth` and asks for the password, which must match `MONGODB_PASSWORD` in `secret-env`.
- `helm_packages/mongodb-helm/tilt/values.yaml` still has a fixed password. It is for minikube only.

For a database that was installed with the old values, the password in use is the one that was published in this repository. Rotate it, then create `glados-mongodb-auth` with the new password and the existing replica set key before running `helm upgrade`:

```bash
# The key the running replica set already uses
kubectl get secret glados-mongodb -o jsonpath='{.data.mongodb-replica-set-key}' | base64 -d
```

## Rolling this out to an existing cluster

The new backend and runner images need the new ServiceAccounts and Deployment settings, so restarting the Deployments alone (the admin "redeploy" button) is not enough the first time. From `kubernetes_init/` on a machine with cluster access:

```bash
python3 init.py --update
```

This applies the accounts, permissions and policies, recreates the frontend and backend Deployments, and removes the old permissions of the `default` ServiceAccount.

## Checking the boundary

Unit tests, run by the backend and runner CI jobs:

- `apps/backend/tests/test_manifests.py` checks the manifests: permissions per identity, nothing bound to `default`, which Deployment gets which secrets.
- `apps/backend/tests/test_runner_job.py` checks the Job a runner gets.
- `apps/backend/tests/test_app.py` and `test_auth.py` check who may call which endpoint.
- `apps/runner/tests/test_archive.py` checks zip extraction.

Against a development cluster (minikube with `tilt up` running or finished):

```bash
bash development_scripts/security/verify_isolation.sh
```

The script asks Kubernetes what each identity may do, then starts a Pod shaped like a runner and tries every backend endpoint without valid credentials. It also reports whether that Pod can reach MongoDB and the Kubernetes API over the network, as a warning, because that depends on the network plugin.

## Known gaps

- **Network isolation is not enforced** until the cluster has a network plugin that supports NetworkPolicy.
- **User code and the runner share a container.** User code can therefore tamper with its own experiment's results and status. Running trials in a separate Pod would remove this.
- **MongoDB is reachable on node ports 30000 and 30001** (`externalAccess` in the chart values). Check whether production still needs this.
- **The frontend and backend use the MongoDB root user.** A dedicated user limited to `gladosdb` would be safer.
- **The process count of a runner is not limited.** Kubernetes can only do this per node (`podPidsLimit` in the kubelet configuration).
- **Base images are old.** The backend uses Python 3.8 and the runner Python 3.9, which no longer receive security fixes, and the MongoDB chart uses an archived `bitnamilegacy` image.
- **Python dependencies have known vulnerabilities.** A `pip-audit` scan of the images in November 2026 reported advisories for 17 backend packages and 24 runner packages (among them `pymongo`, `urllib3`, `werkzeug`, `flask-cors`, `pillow`, `cryptography` and `gunicorn`). Many fixes need a newer Python than the images use, so this goes together with the base image update.
