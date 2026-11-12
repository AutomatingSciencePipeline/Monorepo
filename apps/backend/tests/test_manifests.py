"""Configuration checks for the Kubernetes manifests that define the GLADOS security boundaries"""
import glob
import os
import unittest

import yaml

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
KUBERNETES_INIT = os.path.join(REPO_ROOT, "kubernetes_init")
SECURITY_DIR = os.path.join(KUBERNETES_INIT, "security")

BACKEND = ("ServiceAccount", "glados-backend", "default")
FRONTEND = ("ServiceAccount", "glados-frontend", "default")
RUNNER = ("ServiceAccount", "glados-runner", "default")


def _load(pattern):
    documents = []
    for file_path in sorted(glob.glob(os.path.join(KUBERNETES_INIT, pattern))):
        with open(file_path, encoding="utf-8") as yaml_file:
            documents += [(file_path, document) for document in yaml.safe_load_all(yaml_file) if document]
    return documents


@unittest.skipUnless(os.path.isdir(os.path.join(REPO_ROOT, "helm_packages")), "helm_packages is not available (running outside the repository)")
class TestMongoChartValues(unittest.TestCase):

    def _auth(self, relative_path):
        with open(os.path.join(REPO_ROOT, "helm_packages", "mongodb-helm", relative_path), encoding="utf-8") as yaml_file:
            return yaml.safe_load(yaml_file)["auth"]

    def test_production_values_hold_no_password(self):
        auth = self._auth("values.yaml")

        self.assertIs(auth["enabled"], True)
        self.assertEqual(auth["existingSecret"], "glados-mongodb-auth")
        for key in ("rootPassword", "password", "passwords", "replicaSetKey"):
            self.assertNotIn(key, auth)

    def test_development_values_still_enable_authentication(self):
        self.assertIs(self._auth(os.path.join("tilt", "values.yaml"))["enabled"], True)


def _subjects(binding):
    return [(subject["kind"], subject["name"], subject.get("namespace")) for subject in binding.get("subjects", [])]


@unittest.skipUnless(os.path.isdir(SECURITY_DIR), "kubernetes_init is not available (running outside the repository)")
class TestClusterManifests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.documents = [document for _path, document in _load("**/*.yaml") if isinstance(document, dict) and "kind" in document]
        cls.by_kind = {}
        for document in cls.documents:
            # secret.yaml is a local, untracked file and is not part of these checks
            if document["kind"] == "Secret":
                continue
            cls.by_kind.setdefault(document["kind"], []).append(document)
        cls.bindings = cls.by_kind.get("RoleBinding", []) + cls.by_kind.get("ClusterRoleBinding", [])
        cls.roles = {(role["kind"], role["metadata"]["name"]): role for role in cls.by_kind.get("Role", []) + cls.by_kind.get("ClusterRole", [])}

    def _rules_for(self, subject):
        rules = []
        for binding in self.bindings:
            if subject in _subjects(binding):
                role = self.roles[(binding["roleRef"]["kind"], binding["roleRef"]["name"])]
                scope = "cluster" if binding["kind"] == "ClusterRoleBinding" else "namespace"
                rules += [(scope, rule) for rule in role["rules"]]
        return rules

    def _permissions(self, subject):
        return {
            (scope, group, resource, verb)
            for scope, rule in self._rules_for(subject)
            for group in rule["apiGroups"] for resource in rule["resources"] for verb in rule["verbs"]
        }

    def test_nothing_is_bound_to_the_default_service_account(self):
        for binding in self.bindings:
            for kind, name, _namespace in _subjects(binding):
                self.assertFalse(kind == "ServiceAccount" and name == "default", binding["metadata"]["name"])
                self.assertNotIn(kind, ("Group", "User"), binding["metadata"]["name"])

    def test_runner_account_has_no_permissions_and_no_token(self):
        self.assertEqual(self._rules_for(RUNNER), [])
        account = next(a for a in self.by_kind["ServiceAccount"] if a["metadata"]["name"] == "glados-runner")
        self.assertIs(account["automountServiceAccountToken"], False)

    def test_backend_permissions_are_exactly_what_it_uses(self):
        self.assertEqual(self._permissions(BACKEND), {
            ("namespace", "batch", "jobs", "create"),
            ("namespace", "batch", "jobs", "delete"),
            ("cluster", "authentication.k8s.io", "tokenreviews", "create"),
        })

    def test_frontend_permissions_are_exactly_what_it_uses(self):
        self.assertEqual(self._permissions(FRONTEND), {
            ("namespace", "", "pods", "list"),
            ("namespace", "", "pods/log", "get"),
            ("namespace", "apps", "deployments", "patch"),
            ("cluster", "", "nodes", "list"),
            ("cluster", "", "nodes", "patch"),
        })

    def test_write_access_is_limited_to_named_objects(self):
        for subject in (FRONTEND,):
            for _scope, rule in self._rules_for(subject):
                if "patch" in rule["verbs"]:
                    self.assertTrue(rule.get("resourceNames"), rule)

    def test_no_wildcards_or_secret_access(self):
        for role in self.roles.values():
            for rule in role["rules"]:
                for field in ("apiGroups", "resources", "verbs"):
                    self.assertNotIn("*", rule[field], role["metadata"]["name"])
                self.assertNotIn("secrets", rule["resources"], role["metadata"]["name"])

    def test_every_binding_refers_to_a_known_role_and_account(self):
        accounts = {account["metadata"]["name"] for account in self.by_kind["ServiceAccount"]}
        for binding in self.bindings:
            self.assertIn((binding["roleRef"]["kind"], binding["roleRef"]["name"]), self.roles)
            for _kind, name, _namespace in _subjects(binding):
                self.assertIn(name, accounts)

    def test_deployments_use_their_own_service_account(self):
        deployments = {}
        for document in self.by_kind["Deployment"]:
            deployments.setdefault(document["metadata"]["name"], []).append(document)
        for name in ("glados-backend", "glados-frontend"):
            # one production manifest and one Tilt manifest each
            self.assertEqual(len(deployments[name]), 2, name)
            for deployment in deployments[name]:
                pod = deployment["spec"]["template"]
                self.assertEqual(pod["spec"]["serviceAccountName"], name)
                self.assertEqual(pod["metadata"]["labels"]["glados-component"], name[len("glados-"):])

    def test_frontend_gets_a_token_that_only_the_backend_accepts(self):
        for deployment in self.by_kind["Deployment"]:
            if deployment["metadata"]["name"] != "glados-frontend":
                continue
            sources = [
                source["serviceAccountToken"]
                for volume in deployment["spec"]["template"]["spec"]["volumes"]
                for source in volume.get("projected", {}).get("sources", []) if "serviceAccountToken" in source
            ]
            self.assertEqual([source["audience"] for source in sources], ["glados-backend"])

    def test_gmail_credentials_only_go_to_the_backend(self):
        for deployment in self.by_kind["Deployment"]:
            names = {entry["name"] for container in deployment["spec"]["template"]["spec"]["containers"] for entry in container.get("env", [])}
            self.assertEqual("GMAIL_CREDS" in names, deployment["metadata"]["name"] == "glados-backend")

    def test_runner_network_policy_blocks_private_ranges(self):
        policy = next(p for p in self.by_kind["NetworkPolicy"] if p["metadata"]["name"] == "glados-runner-isolation")
        self.assertEqual(policy["spec"]["podSelector"], {"matchLabels": {"glados-component": "runner"}})
        self.assertEqual(sorted(policy["spec"]["policyTypes"]), ["Egress", "Ingress"])
        self.assertEqual(policy["spec"]["ingress"], [])
        blocks = [peer["ipBlock"] for rule in policy["spec"]["egress"] for peer in rule["to"] if "ipBlock" in peer]
        self.assertEqual(len(blocks), 1)
        for private_range in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16"):
            self.assertIn(private_range, blocks[0]["except"])

    def test_backend_only_accepts_frontend_and_runner_pods(self):
        policy = next(p for p in self.by_kind["NetworkPolicy"] if p["metadata"]["name"] == "glados-backend-ingress")
        peers = [peer["podSelector"]["matchLabels"]["glados-component"] for rule in policy["spec"]["ingress"] for peer in rule["from"]]
        self.assertEqual(sorted(peers), ["frontend", "runner"])
