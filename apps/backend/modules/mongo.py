import pymongo
from pymongo.errors import ConnectionFailure

def verify_mongo_connection(mongoClient):
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        # just use a generic exception
        raise Exception("MongoDB server not available/unreachable") from err