# Getting Started From Zero

This page is for a brand-new team member who has **nothing** set up yet: no accounts, no tools, no repo. It walks from a blank laptop to a running local copy of GLADOS that you can sign in to and run an experiment on. The other developer pages assume most of this is already done.

Read it top to bottom the first time. Afterwards, the [Daily workflow](#8-daily-workflow) section is the only part you will need.

!!! note "How long this takes"
    Plan for one afternoon. Most of the time is spent downloading Docker images and waiting for the Kubernetes cluster to come up. Nothing here needs to be done twice.

## 0. Vocabulary

You will see these words everywhere in the code and docs.

| Term | Meaning |
|------|---------|
| **Experiment** | One submission from the web UI or CLI: a program plus a set of parameters to sweep over. |
| **Trial** (also "run") | One execution of that program with one generated config file. |
| **Permutation** | One combination of parameter values. Each permutation becomes one trial. |
| **Runner** | A short-lived Kubernetes Job that executes all trials of one experiment and writes results back to the database. |
| **Frontend** | The Next.js web app in `apps/frontend`. Talks to MongoDB directly and calls the backend to start experiments. |
| **Backend** | The Flask app in `apps/backend`. Its main job is creating runner Jobs. |
| **Tilt** | The tool that builds the three images, deploys them into your local cluster, and hot-reloads on code changes. |
| **minikube** | A single-node Kubernetes cluster that runs inside Docker on your laptop. |
| **Dev container** | A Docker image with every tool preinstalled. VS Code runs your terminal and editor inside it. |
| **GridFS** | The MongoDB feature used to store uploaded experiment files and result zips. |

## 1. Accounts and access to ask for in week one

Ask the previous team or the faculty advisor for these on day one. Some take days to get.

1. **GitHub organization membership** for [AutomatingSciencePipeline](https://github.com/AutomatingSciencePipeline). You need write access to push branches and open pull requests. The task board is the [GitHub Project](https://github.com/orgs/AutomatingSciencePipeline/projects/1/views/1).
2. **The team Discord.** The Kubernetes secrets file (`secret.yaml`) is not in git. The previous team stored it in the private Discord. You cannot run the system locally without it. See [step 5](#5-get-the-secrets-file).
3. **Rose-Hulman network or VPN access.** The production site <https://glados.csse.rose-hulman.edu/> is only reachable on campus network.
4. **OAuth app ownership.** Sign-in uses Google and GitHub OAuth apps. Find out who owns them and get added as an owner. If the local callback URL is not registered on those apps, local sign-in will fail. See [Sign in for the first time](#sign-in-for-the-first-time).
5. **Server access** (later, not week one). The production cluster and the `glados-forge` development VM are documented under [VMs](../infrastructure/vms.md) and [Deployment](../tutorial/deployment.md).

## 2. Install tools on your laptop

These instructions were last verified on Windows 11 with Docker Desktop. Mac and Linux users skip the WSL parts.

### Windows

1. **WSL2 with Ubuntu.** Open PowerShell as administrator and run `wsl --install -d Ubuntu`. Reboot, then open "Ubuntu" from the Start menu once to create your Linux user. Confirm with `wsl -l -v` that Ubuntu shows `VERSION 2`.
2. **Docker Desktop.** Install from <https://www.docker.com/products/docker-desktop/>. In Settings, enable "Use the WSL 2 based engine" and, under Resources, WSL Integration, turn on integration for Ubuntu.
3. **VS Code** with these extensions: "Dev Containers" (`ms-vscode-remote.remote-containers`) and "WSL" (`ms-vscode-remote.remote-wsl`).
4. **Git** on Windows, and `git` inside Ubuntu (`sudo apt install git rsync`). The copy script uses `rsync`.
5. **Python 3** on Windows, only to run the one helper script in the next step.

!!! warning "Why WSL is required on Windows"
    Tilt's live update watches files with Linux file events. Files on the Windows filesystem mounted into Docker do not send those events, so hot reload does not work. The project therefore copies the repo into the WSL filesystem and runs the dev container from there.

### Mac and Linux

1. **Docker Desktop** (Mac) or Docker Engine (Linux). Give Docker at least 4 CPUs and 10 GB of memory in its settings, because minikube will ask for 3 CPUs and about 8 GB.
2. **VS Code** with the "Dev Containers" extension.
3. **Git.**

## 3. Clone the repo

```bash
git clone https://github.com/AutomatingSciencePipeline/Monorepo.git
cd Monorepo
```

On Windows, clone it anywhere on your Windows drive. The next step copies it into WSL.

## 4. Open the dev container

### Windows

From the repo root in a Windows terminal:

```bash
python .devcontainer/start_in_wsl.py
```

The script copies the repo to `~/Monorepo` inside Ubuntu with `rsync --delete`, then opens VS Code on that copy. It warns you that it is destructive to the WSL copy. Say yes the first time.

!!! danger "You now have two copies of the repo"
    The Windows folder you cloned and `~/Monorepo` inside WSL are separate. The dev container mounts the **WSL** copy. Edit, commit, and push from inside the container terminal (or from the WSL copy). If you edit the Windows copy, nothing happens in the running app. Rerunning `start_in_wsl.py` overwrites uncommitted work in the WSL copy.

### Mac and Linux

Open the cloned folder in VS Code.

### Everyone

VS Code will show a prompt in the bottom right: "Reopen in Container". Click it. If it does not appear, press `F1`, type "Dev Containers: Rebuild and Reopen in Container", and run that.

The first time this pulls the `gladospipeline/glados-dev-container:main` image, which is large. Wait until the VS Code terminal opens with a prompt like `codespace ➜ /workspaces/Monorepo`. That terminal is inside the container. Every command below is run there.

The container already has Python, Node, Docker CLI, `kubectl`, `minikube`, `ctlptl`, `helm`, and `tilt` installed. You should not install those on your laptop.

## 5. Get the secrets file

Ask the team for `secret.yaml` and place it at:

```
kubernetes_init/kubernetes_secrets/secret.yaml
```

It is listed in `.gitignore` and must never be committed. It is a Kubernetes `Secret` named `secret-env` with these keys. The values are base64 encoded.

| Key | Used by | Purpose |
|-----|---------|---------|
| `FRONTEND_WEBSERVER_PORT`, `BACKEND_PORT`, `MONGODB_PORT` | all | Ports. Normally 3000, 5050, 27017. |
| `MONGODB_USERNAME`, `MONGODB_PASSWORD` | frontend, backend, runner | Database login. Must match the root user in `helm_packages/mongodb-helm/tilt/values.yaml`. |
| `AUTH_SECRET` | frontend | Auth.js session signing key. |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | frontend | GitHub OAuth app. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | frontend | Google OAuth app. |
| `AUTH_URL`, `AUTH_REDIRECT_PROXY_URL`, `AUTH_TRUST_HOST` | frontend | Where Auth.js thinks the site lives. For local work this must point at `http://localhost:3000`. |
| `GMAIL_CREDS` | runner | Credentials for the "email me when done" feature. |

If nobody can find the file, you can build a new one for local use: copy the structure above, generate a random `AUTH_SECRET`, create your own GitHub OAuth app with callback URL `http://localhost:3000/api/auth/callback/github`, and reuse the MongoDB values from the helm values file. Everything else can be a placeholder until you need that feature. The frontend deployment that mounts these keys is `kubernetes_init/tilt/deployment-frontend.yaml`, so that file is the source of truth for which keys must exist.

## 6. One-time cluster setup

Run this once per dev container, from the repo root inside the container:

```bash
./.devcontainer/post-start.sh
```

It does four things:

1. `npm i` in `apps/frontend`.
2. Sets minikube to 3 CPUs and 7800 MB of memory, then **deletes** any existing minikube cluster.
3. Creates a fresh cluster with `ctlptl create cluster minikube --registry=ctlptl-registry`. The registry is what lets Tilt push locally built images into the cluster.
4. `pip install`s the Python packages the backend and runner need.

It takes several minutes. When it finishes, `minikube status` should report the host, kubelet, and apiserver as `Running`.

!!! tip "Not enough memory?"
    If cluster creation fails with a memory error, lower the number in the `minikube config set memory` line of `post-start.sh` to fit your machine, or raise Docker Desktop's memory limit. A recent teammate ran with 7600 MB.

!!! danger "Never rerun this script casually"
    It runs `minikube delete`, which wipes the cluster and with it your local database. Only run it again when you have a **fresh** container (see [Rebuilt container](#rebuilt-container-everything-is-gone) below).

## 7. Start GLADOS

From the repo root inside the container:

```bash
tilt up
```

Press space to open the Tilt web UI, or go to <http://localhost:10350>. Tilt builds the `frontend`, `backend`, and `runner` images, installs MongoDB with Helm, and deploys everything. The first build is slow. When the header shows all resources green (10/10), open <http://localhost:3000>.

What Tilt is running:

| Resource | What it is | Reach it at |
|----------|------------|-------------|
| `glados-frontend` | Next.js app | <http://localhost:3000> |
| `glados-backend` | Flask API | <http://localhost:5050> |
| `glados-mongodb` | MongoDB replica set via Helm | `localhost:30000` |
| `fix-minikube-folder-perms-*` | One-shot jobs that create the MongoDB data folders inside minikube | n/a |
| `runner` | Image only. A Job is created from it each time an experiment starts | see the experiment walkthrough |

You can confirm from the terminal:

```bash
kubectl get pods
```

You should see one frontend pod, one backend pod, and three MongoDB pods (`glados-mongodb-0`, `glados-mongodb-1`, `glados-mongodb-arbiter-0`), all `Running`.

### Sign in for the first time

The landing page offers "Sign in with Google" and "Sign in with GitHub". There is no username and password login and no mock login for development. Use a real account.

If sign-in bounces back to the landing page or shows an OAuth error, the cause is almost always one of:

- `AUTH_URL` in `secret.yaml` does not say `http://localhost:3000`.
- The OAuth app does not have `http://localhost:3000/api/auth/callback/github` (or `/google`) registered as a callback URL.

After you change `secret.yaml`, Tilt reapplies it, but the frontend pod only reads it at start. Click the refresh arrow on `glados-frontend` in the Tilt UI to restart it.

Your account is created in the `gladosdb` database with role `user`. Roles are `user`, `privileged`, and `admin`. Only an admin sees the "Admin" link in the profile menu. To make yourself admin locally, edit your document in the `users` collection and set `role` to `admin`. The [experiment walkthrough](../tutorial/experiment_walkthrough.md#24-poking-at-the-database) shows how to connect to the database.

## 8. Daily workflow

Once the steps above are done, a normal day looks like this.

1. Open VS Code on the WSL copy (Windows: open a WSL terminal, `cd ~/Monorepo`, `code .`) and choose "Reopen in Container".
2. In the container terminal, check the cluster is up: `minikube status`. If it is stopped, `minikube start`.
3. `tilt up`, wait for green, open <http://localhost:3000>.
4. Edit code. Frontend and backend changes sync into the running pods automatically. Runner changes rebuild the runner image and apply to the next experiment you start.
5. When you are done, `Ctrl+C` in the Tilt terminal, then `tilt down`. This also uninstalls the MongoDB chart and deletes its volume claims, so local experiments do not survive `tilt down`. If you want to keep your data, just stop Tilt with `Ctrl+C` and leave the pods running.
6. Commit from the container terminal. Branch off `dev` or `main` per [Best Practices](../tutorial/best_practices.md).

## 9. When things go wrong

### Rebuilt container: everything is gone

If VS Code rebuilt the dev container (after a `devcontainer.json` change, a Docker reset, or a long gap), the new container has **no cluster and no pip packages**, because those live inside the container. Symptoms:

- `minikube status` says `the "minikube" host does not exist`.
- `kubectl get pods` says `connection to the server localhost:8080 was refused`.
- Every Tilt resource is red immediately after `tilt up`.

Fix: stop Tilt, run `./.devcontainer/post-start.sh` once, then `tilt up` again. Your `node_modules` and source are on the mounted volume and survive.

### "Error - Backend Offline" in the dashboard sidebar

The frontend cannot reach `glados-backend` on port 5050. Check the backend pod in Tilt for a crash, usually an import error or a MongoDB connection failure.

### Sign-in loops back to the landing page

See [Sign in for the first time](#sign-in-for-the-first-time).

### Ports 3000 or 10350 do not open in the browser

Open the "Ports" tab in VS Code (next to Terminal). Make sure 3000, 5050, and 10350 are forwarded. Remove and re-add a port if it is stuck.

### Docker is not running

The container needs the host Docker daemon. Start Docker Desktop, then reopen the container.

### MongoDB pods restart or stay `Pending`

Usually memory. Lower minikube memory per [step 6](#6-one-time-cluster-setup), or check `kubectl describe pod glados-mongodb-0`.

## 10. Where to go next

- [Your first experiment](../tutorial/experiment_walkthrough.md): the happy path through the UI and what happens behind it.
- [Architecture](../infrastructure/architecture.md) and [Kubernetes](../infrastructure/kubernetes.md): how the pieces fit.
- [Best Practices](../tutorial/best_practices.md): branching, the task board, and code review.
- [Updating Documentation](../documentation/guide.md): how to preview and publish this site.

Repo map for orientation:

```
apps/frontend      Next.js web UI, Auth.js, direct MongoDB access, /api routes
apps/backend       Flask API that creates runner Jobs
apps/runner        Python code that runs inside each runner Job
kubernetes_init    Kubernetes manifests (tilt/ for local, others for production)
helm_packages      Helm values for MongoDB and ingress
example_experiments  Sample programs you can upload as experiments
docs               This site (MkDocs)
Tiltfile           Local dev orchestration
.devcontainer      Dev container definition and one-time setup script
```
