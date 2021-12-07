import hashlib #library to hash a password
class User:
    def __init__(self, username, password):
        self.username = username
        self.password = password
    def hashPassowrd(password):
        return hashlib.sha256(str.encode(password)).hexdigest()
    