#!/bin/bash
# Checks, against the cluster kubectl currently points at, that user-submitted experiment code is
# separated from the GLADOS control plane. Meant for a development cluster (minikube + Tilt).
#
# Usage: bash development_scripts/security/verify_isolation.sh
#
# Exits with 1 if a boundary that GLADOS enforces itself is broken. Network checks only produce
# warnings, because NetworkPolicies need a network plugin that enforces them (minikube's default
# and plain Flannel do not).

NAMESPACE="default"
BACKEND_PORT="${BACKEND_PORT:-5050}"
BACKEND_URL="http://glados-service-backend:${BACKEND_PORT}"
PROBE_IMAGE="${PROBE_IMAGE:-curlimages/curl:8.11.1}"
PROBE_POD="glados-isolation-probe"
FAILURES=0
WARNINGS=0

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo "  WARN  $1"; WARNINGS=$((WARNINGS + 1)); }

# expect_can_i <yes|no> <service account> <verb> <resource> [extra kubectl args]
expect_can_i() {
  local expected="$1" account="$2" verb="$3" resource="$4"
  shift 4
  local answer
  answer=$(kubectl auth can-i "$verb" "$resource" "$@" --as="system:serviceaccount:${NAMESPACE}:${account}" 2>/dev/null)
  answer="${answer:-no}"
  if [ "$answer" == "$expected" ]; then
    pass "$account: $verb $resource $* -> $answer"
  else
    fail "$account: $verb $resource $* -> $answer (expected $expected)"
  fi
}

echo "Kubernetes permissions"
for account in glados-runner default; do
  expect_can_i no "$account" create jobs.batch -n "$NAMESPACE"
  expect_can_i no "$account" delete jobs.batch -n "$NAMESPACE"
  expect_can_i no "$account" list pods -n "$NAMESPACE"
  expect_can_i no "$account" get pods --subresource=log -n "$NAMESPACE"
  expect_can_i no "$account" get secrets -n "$NAMESPACE"
  expect_can_i no "$account" patch deployments.apps -n "$NAMESPACE"
  expect_can_i no "$account" patch nodes
  expect_can_i no "$account" create tokenreviews.authentication.k8s.io
done
expect_can_i yes glados-backend create jobs.batch -n "$NAMESPACE"
expect_can_i yes glados-backend delete jobs.batch -n "$NAMESPACE"
expect_can_i yes glados-backend create tokenreviews.authentication.k8s.io
expect_can_i no glados-backend get secrets -n "$NAMESPACE"
expect_can_i no glados-backend list pods -n "$NAMESPACE"
expect_can_i no glados-backend patch deployments.apps -n "$NAMESPACE"
expect_can_i no glados-backend patch nodes
expect_can_i yes glados-frontend list pods -n "$NAMESPACE"
expect_can_i yes glados-frontend get pods --subresource=log -n "$NAMESPACE"
expect_can_i yes glados-frontend patch deployments.apps/glados-backend -n "$NAMESPACE"
expect_can_i no glados-frontend delete deployments.apps/glados-backend -n "$NAMESPACE"
expect_can_i no glados-frontend create jobs.batch -n "$NAMESPACE"
expect_can_i no glados-frontend get secrets -n "$NAMESPACE"
expect_can_i no glados-frontend delete pods -n "$NAMESPACE"

echo "Runner Pod, as seen from inside"
# A Pod shaped like a runner: same ServiceAccount, same label (so the same NetworkPolicy), no token
kubectl delete pod "$PROBE_POD" -n "$NAMESPACE" --ignore-not-found --wait=true >/dev/null 2>&1
cat <<PROBE | kubectl apply -n "$NAMESPACE" -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: $PROBE_POD
  labels:
    glados-component: runner
spec:
  serviceAccountName: glados-runner
  automountServiceAccountToken: false
  enableServiceLinks: false
  restartPolicy: Never
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: probe
    image: $PROBE_IMAGE
    command: ["sleep", "600"]
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
PROBE
if ! kubectl wait --for=condition=Ready "pod/$PROBE_POD" -n "$NAMESPACE" --timeout=120s >/dev/null 2>&1; then
  fail "could not start the probe Pod (is the glados-runner ServiceAccount installed?)"
  kubectl delete pod "$PROBE_POD" -n "$NAMESPACE" --ignore-not-found --wait=false >/dev/null 2>&1
  echo "$FAILURES failed"
  exit 1
fi
probe() { kubectl exec "$PROBE_POD" -n "$NAMESPACE" -- "$@" 2>/dev/null; }
http_status() { probe curl -s -o /dev/null -m 10 -w '%{http_code}' "$@"; }

if probe test -e /var/run/secrets/kubernetes.io/serviceaccount/token; then
  fail "a Kubernetes API token is mounted in the runner Pod"
else
  pass "no Kubernetes API token is mounted"
fi

expect_status() {
  local expected="$1" description="$2"
  shift 2
  local status
  status=$(http_status "$@")
  if [ "$status" == "$expected" ]; then
    pass "$description -> $status"
  else
    fail "$description -> $status (expected $expected)"
  fi
}

if [ "$(http_status "$BACKEND_URL/")" != "200" ]; then
  fail "the backend is not reachable from a runner Pod, so the endpoint checks cannot run"
else
  JSON=(-H 'Content-Type: application/json')
  ID="000000000000000000000000"
  expect_status 401 "start an experiment without credentials" -X POST "${JSON[@]}" -d "{\"experiment\":{\"id\":\"$ID\"}}" "$BACKEND_URL/experiment"
  expect_status 401 "cancel an experiment without credentials" -X POST "${JSON[@]}" -d "{\"jobName\":\"runner-$ID\"}" "$BACKEND_URL/cancelExperiment"
  expect_status 401 "read the queue without credentials" "$BACKEND_URL/queue"
  expect_status 401 "read an experiment without a runner token" -X POST "${JSON[@]}" -d "{\"experimentId\":\"$ID\"}" "$BACKEND_URL/getExperiment"
  expect_status 401 "change an experiment without a runner token" -X POST "${JSON[@]}" -d "{\"experimentId\":\"$ID\",\"field\":\"status\",\"newValue\":\"COMPLETED\"}" "$BACKEND_URL/updateExperiment"
  expect_status 401 "upload results without a runner token" -X POST "${JSON[@]}" -d "{\"experimentId\":\"$ID\",\"results\":\"x\"}" "$BACKEND_URL/uploadResults"
  expect_status 401 "upload a log without a runner token" -X POST "${JSON[@]}" -d "{\"experimentId\":\"$ID\",\"logContents\":\"x\"}" "$BACKEND_URL/uploadLog"
  expect_status 401 "download a file without a runner token" "$BACKEND_URL/downloadExpFile?fileId=$ID"
  expect_status 401 "send an email without a runner token" -X POST "${JSON[@]}" -d "{\"experimentId\":\"$ID\",\"status\":\"COMPLETED\"}" "$BACKEND_URL/sendExperimentEmail"
  expect_status 401 "use a made-up token" -X POST "${JSON[@]}" -H 'Authorization: Bearer made-up' -d "{\"experiment\":{\"id\":\"$ID\"}}" "$BACKEND_URL/experiment"
fi

echo "Network reachability from a runner Pod (needs a network plugin that enforces NetworkPolicy)"
# tcp_open <host> <port>: succeeds if a TCP connection can be opened
tcp_open() {
  kubectl exec "$PROBE_POD" -n "$NAMESPACE" -- nc -z -w 5 "$1" "$2" >/dev/null 2>&1
}
for target in "glados-service-mongodb 27017" "kubernetes.default.svc 443"; do
  # shellcheck disable=SC2086
  if tcp_open $target; then
    warn "runner Pod can open a connection to $target (NetworkPolicy is not being enforced here)"
  else
    pass "runner Pod cannot reach $target"
  fi
done

kubectl delete pod "$PROBE_POD" -n "$NAMESPACE" --ignore-not-found --wait=false >/dev/null 2>&1

echo
echo "$FAILURES failed, $WARNINGS warnings"
[ "$FAILURES" -eq 0 ]
