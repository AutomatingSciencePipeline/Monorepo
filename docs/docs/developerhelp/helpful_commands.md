# Helpful Commands

This page will eventually replace the cheatsheet.md page.

This will be a page describing tasks that are simple but may be helpful to developers in the future.

## Local development (Tilt + minikube)

These all run in the dev container terminal. See [Your First Experiment](../tutorial/experiment_walkthrough.md) for what each layer does.

### Start, stop, restart

```bash
minikube status                 # cluster up? if "host does not exist", run ./.devcontainer/post-start.sh
minikube start                  # start a stopped cluster
tilt up                         # build + deploy everything, UI at http://localhost:10350
tilt trigger glados-backend     # rebuild/restart one resource (also: glados-frontend, glados-mongodb, runner)
tilt down                       # tear down; also uninstalls MongoDB and deletes its volumes
```

### Look at what is running

```bash
kubectl get pods                       # frontend, backend, 3 mongo pods, plus runner-<expId> while experiments run
kubectl get jobs                       # one Job per dispatched experiment
kubectl logs -f deploy/glados-backend  # backend logs
kubectl logs -f deploy/glados-frontend # frontend logs
kubectl logs -f job/runner-<expId>     # runner logs (pod is deleted ~60 s after it finishes)
kubectl describe pod <pod-name>        # why a pod is Pending / ImagePullBackOff / OOMKilled
kubectl delete job runner-<expId>      # clear a stuck or duplicate runner job
```

### Database

Tilt forwards MongoDB to `localhost:30000`. The root user and password are under `auth` in `helm_packages/mongodb-helm/tilt/values.yaml`.

```bash
mongosh "mongodb://<user>:<password>@localhost:30000/gladosdb?authSource=admin&directConnection=true"
```

```javascript
db.experiments.find({}, {name:1, status:1, passes:1, fails:1, totalExperimentRuns:1})
db.users.updateOne({email: "you@example.com"}, {$set: {role: "admin"}})
db.dropDatabase()   // soft reset of all local data
```

Hard reset of the local database: `tilt down`, then `minikube ssh -- sudo rm -rf /srv/data/mongo-1 /srv/data/mongo-2`, then `tilt up`.

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | <http://localhost:3000> |
| Backend | <http://localhost:5050> (`/` returns 200 when healthy, `/mongoPulse` checks the DB) |
| Tilt UI | <http://localhost:10350> |
| MongoDB | `localhost:30000` |

## Production cluster

### Joining a node to the cluster

Run the following command on the control-plane.

```bash
kubeadm token create --print-join-command
```

This will give you a command printed to the terminal. You run the given command on the worker you are attempting to join to the cluster.

Example:

```bash
sudo kubeadm join 123.123.123.123:1234 --token abcde.123465fiasda --discovery-token-ca-cert-hash sha256:1234...abcdef
```

### Pipenv usage

To activate the backend python environment in the terminal, run `source apps/backend/.venv/Scripts/activate`

To activate the documentation python environment in the terminal, run `source docs/.venv/Scripts/activate`

To disable, run `deactivate`

## Tips

### Aliases

You can use command aliases to avoid remembering long, but commonly used terminal commands, or even multiple commands. I (Alan) personally found making aliases for git commands to be useful for general development, even outside of this project. There are many guides online showing how to set up aliases on various terminal environments, it may differ depending on what terminal you use.
