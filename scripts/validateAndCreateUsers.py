from classes import User


def createUser(username, password): #need to figure out a way to get a user name and password
    user = User(username, password)
    user.hashPassowrd(password)
def storeUserInDatabase:
    ""