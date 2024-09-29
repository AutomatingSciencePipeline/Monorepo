import json
import pymongo
from pymongo.errors import ConnectionFailure
from bson import Binary

def verify_mongo_connection(mongoClient):
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        # just use a generic exception
        raise Exception("MongoDB server not available/unreachable") from err
    
def upload_experiment_aggregated_results(experimentId: str, results: str, mongoClient):
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
    
def upload_experiment_zip(experimentId: str, encoded: Binary, mongoClient):
    experimentZipEntry = {"_id": experimentId, "fileContent": encoded}
    zipCollection = mongoClient["gladosdb"].zips
    try:
        # TODO: Refactor to call the backend
        resultZipId = zipCollection.insert_one(experimentZipEntry).inserted_id
        return resultZipId
    except Exception as err:
        raise Exception("Encountered error while storing results zip in MongoDB") from err
    
def upload_log_file(experimentId: str, contents: str, mongoClient):
    logFileEntry = {"_id": experimentId, "fileContent": contents}
    logCollection = mongoClient["gladosdb"].logs
    try:
        resultId = logCollection.insert_one(logFileEntry).inserted_id
        return resultId
    except Exception as err:
        raise Exception("Encountered error while storing log file in MongoDB") from err