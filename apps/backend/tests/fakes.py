"""Small stand-ins for MongoDB and the Kubernetes API, just enough for the security tests"""
from types import SimpleNamespace


class FakeTokenCollection:
    """Implements the handful of pymongo calls that modules/auth.py uses"""

    def __init__(self):
        self.documents = []

    def create_index(self, *_args, **_kwargs):
        return None

    def insert_one(self, document):
        self.documents.append(dict(document))

    def find_one(self, query):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return document
        return None

    def delete_many(self, query):
        self.documents = [
            document for document in self.documents
            if not all(document.get(key) == value for key, value in query.items())
        ]

    def update_one(self, query, update):
        for document in self.documents:
            if document.get("tokenHash") == query["tokenHash"] and document.get("emailSent") is not True:
                document.update(update["$set"])
                return SimpleNamespace(modified_count=1)
        return SimpleNamespace(modified_count=0)


class FakeAuthenticationApi:
    """Answers TokenReview requests from a table of token -> (username, audiences)"""

    def __init__(self, known_tokens):
        self.known_tokens = known_tokens
        self.reviews = 0

    def create_token_review(self, body):
        self.reviews += 1
        token = body["spec"]["token"]
        requested = body["spec"]["audiences"]
        if token not in self.known_tokens:
            return SimpleNamespace(status=SimpleNamespace(authenticated=False, audiences=None, user=None))
        username, token_audiences = self.known_tokens[token]
        matching = [audience for audience in requested if audience in token_audiences]
        return SimpleNamespace(status=SimpleNamespace(
            authenticated=bool(matching), audiences=matching, user=SimpleNamespace(username=username)))
