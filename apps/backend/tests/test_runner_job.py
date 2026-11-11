import json
import unittest

from modules.runner_job import build_runner_job, load_runner_template, token_ttl_seconds, active_deadline_seconds

EXPERIMENT_ID = "a" * 24
# Secret keys a runner Pod is allowed to read. Everything else in secret-env stays with the control plane.
ALLOWED_SECRET_KEYS = {"BACKEND_PORT"}


def _pod_spec(job):
    return job['spec']['template']['spec']


def _container(job):
    return _pod_spec(job)['containers'][0]


def _env(job):
    return {entry['name']: entry for entry in _container(job)['env']}


class TestStandardRunnerJob(unittest.TestCase):
    """The profile every normal user's experiment runs with"""

    def setUp(self):
        self.job = build_runner_job(load_runner_template(), EXPERIMENT_ID, "tok", "user", env={})

    def test_job_is_named_after_the_experiment(self):
        self.assertEqual(self.job['metadata']['name'], "runner-" + EXPERIMENT_ID)

    def test_runner_only_receives_the_experiment_id(self):
        command = _container(self.job)['command']
        self.assertEqual(command[:2], ["python3", "runner.py"])
        self.assertEqual(json.loads(command[2]), {"experiment": {"id": EXPERIMENT_ID}})

    def test_no_kubernetes_api_token_is_mounted(self):
        self.assertIs(_pod_spec(self.job)['automountServiceAccountToken'], False)
        self.assertEqual(_pod_spec(self.job)['serviceAccountName'], "glados-runner")
        for volume in _pod_spec(self.job)['volumes']:
            self.assertEqual(list(volume.keys() - {"name"}), ["emptyDir"])

    def test_runs_as_non_root_without_capabilities(self):
        pod_security = _pod_spec(self.job)['securityContext']
        container_security = _container(self.job)['securityContext']
        self.assertIs(pod_security['runAsNonRoot'], True)
        self.assertNotEqual(pod_security['runAsUser'], 0)
        self.assertEqual(pod_security['seccompProfile'], {"type": "RuntimeDefault"})
        self.assertIs(container_security['allowPrivilegeEscalation'], False)
        self.assertIs(container_security['readOnlyRootFilesystem'], True)
        self.assertEqual(container_security['capabilities'], {"drop": ["ALL"]})
        self.assertNotIn('privileged', container_security)

    def test_no_host_access(self):
        for key in ("hostNetwork", "hostPID", "hostIPC"):
            self.assertNotIn(key, _pod_spec(self.job))
        for volume in _pod_spec(self.job)['volumes']:
            self.assertNotIn("hostPath", volume)

    def test_only_allowed_secrets_reach_the_runner(self):
        self.assertNotIn('envFrom', _container(self.job))
        secret_keys = {
            entry['valueFrom']['secretKeyRef']['key']
            for entry in _container(self.job)['env'] if 'valueFrom' in entry
        }
        self.assertLessEqual(secret_keys, ALLOWED_SECRET_KEYS)
        for name in ("GMAIL_CREDS", "MONGODB_USERNAME", "MONGODB_PASSWORD", "MONGODB_PORT", "AUTH_SECRET"):
            self.assertNotIn(name, _env(self.job))

    def test_runner_token_is_passed_in(self):
        self.assertEqual(_env(self.job)['RUNNER_TOKEN'], {"name": "RUNNER_TOKEN", "value": "tok"})

    def test_resources_and_deadline_are_bounded(self):
        resources = _container(self.job)['resources']
        for limit in ("cpu", "memory", "ephemeral-storage"):
            self.assertIn(limit, resources['limits'])
        for request in ("cpu", "memory", "ephemeral-storage"):
            self.assertIn(request, resources['requests'])
        self.assertGreater(self.job['spec']['activeDeadlineSeconds'], 0)

    def test_service_addresses_are_not_injected(self):
        self.assertIs(_pod_spec(self.job)['enableServiceLinks'], False)

    def test_pod_is_labelled_for_the_network_policy(self):
        self.assertEqual(self.job['spec']['template']['metadata']['labels']['glados-component'], "runner")

    def test_building_a_job_does_not_change_the_template(self):
        template = load_runner_template()
        untouched = json.dumps(template, sort_keys=True)

        build_runner_job(template, EXPERIMENT_ID, "tok", "admin", env={"RUNNER_CPU_LIMIT": "1"})

        self.assertEqual(json.dumps(template, sort_keys=True), untouched)

    def test_missing_role_gets_the_standard_profile(self):
        for role in (None, "", "user", "Admin", "ADMIN", ["admin"]):
            job = build_runner_job(load_runner_template(), EXPERIMENT_ID, "tok", role, env={})
            self.assertIs(_pod_spec(job)['securityContext'].get('runAsNonRoot'), True, role)


class TestPrivilegedRunnerJob(unittest.TestCase):
    """Admin and privileged users may install system packages, which needs root in the container"""

    def setUp(self):
        self.jobs = [
            build_runner_job(load_runner_template(), EXPERIMENT_ID, "tok", role, env={})
            for role in ("admin", "privileged")
        ]

    def test_runs_as_root_with_writable_filesystem(self):
        for job in self.jobs:
            self.assertEqual(_pod_spec(job)['securityContext']['runAsUser'], 0)
            self.assertNotIn('runAsNonRoot', _pod_spec(job)['securityContext'])
            self.assertIs(_container(job)['securityContext']['readOnlyRootFilesystem'], False)
            self.assertEqual(_env(job)['HOME']['value'], "/root")

    def test_still_has_no_api_token_and_no_escalation(self):
        for job in self.jobs:
            self.assertIs(_pod_spec(job)['automountServiceAccountToken'], False)
            self.assertEqual(_pod_spec(job)['serviceAccountName'], "glados-runner")
            self.assertIs(_container(job)['securityContext']['allowPrivilegeEscalation'], False)
            self.assertNotIn('privileged', _container(job)['securityContext'])
            self.assertEqual(_pod_spec(job)['securityContext']['seccompProfile'], {"type": "RuntimeDefault"})

    def test_still_has_no_extra_secrets_and_keeps_limits(self):
        for job in self.jobs:
            for name in ("GMAIL_CREDS", "MONGODB_USERNAME", "MONGODB_PASSWORD"):
                self.assertNotIn(name, _env(job))
            self.assertIn("memory", _container(job)['resources']['limits'])


class TestRunnerJobConfiguration(unittest.TestCase):

    def test_resources_can_be_overridden_from_the_backend_environment(self):
        env = {
            "RUNNER_CPU_REQUEST": "100m", "RUNNER_MEMORY_REQUEST": "128Mi", "RUNNER_CPU_LIMIT": "2",
            "RUNNER_MEMORY_LIMIT": "1Gi", "RUNNER_EPHEMERAL_STORAGE_LIMIT": "5Gi",
            "RUNNER_ACTIVE_DEADLINE_SECONDS": "120",
        }
        job = build_runner_job(load_runner_template(), EXPERIMENT_ID, "tok", "user", env=env)

        self.assertEqual(_container(job)['resources'], {
            "requests": {"cpu": "100m", "memory": "128Mi", "ephemeral-storage": "1Gi"},
            "limits": {"cpu": "2", "memory": "1Gi", "ephemeral-storage": "5Gi"},
        })
        self.assertEqual(job['spec']['activeDeadlineSeconds'], 120)

    def test_dev_image_override(self):
        job = build_runner_job(load_runner_template(), EXPERIMENT_ID, "tok", "user", env={"IMAGE_RUNNER": "runner"})

        self.assertEqual(_container(job)['image'], "runner")
        self.assertEqual(_container(job)['imagePullPolicy'], "IfNotPresent")

    def test_invalid_deadline_is_rejected(self):
        for bad in ("0", "-5", "soon"):
            with self.assertRaises(ValueError):
                active_deadline_seconds(load_runner_template(), {"RUNNER_ACTIVE_DEADLINE_SECONDS": bad})

    def test_token_outlives_the_job_deadline(self):
        template = load_runner_template()

        self.assertGreater(token_ttl_seconds(template, {}), active_deadline_seconds(template, {}))
