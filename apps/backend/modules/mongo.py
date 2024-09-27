import json
import pymongo
from pymongo.errors import ConnectionFailure

def verify_mongo_connection(mongoClient):
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        # just use a generic exception
        raise Exception("MongoDB server not available/unreachable") from err
    
def upload_experiment_aggregated_results(experimentId: str, results: str, mongoClient):
    # turn experiment JSON into an object
    experimentResultEntry = {"_id": experimentId, "resultContent": results}
    # Get the results connection
    resultsCollection = mongoClient["gladosdb"].results
    try:
        resultId = resultsCollection.insert_one(experimentResultEntry).inserted_id
        # return the resultID
        return resultId
        
    except Exception as err:
        # Change to generic exception
        raise Exception("Encountered error while storing aggregated results in MongoDB") from err