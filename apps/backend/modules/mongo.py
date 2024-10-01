import json
import pymongo
from pymongo.errors import ConnectionFailure
from bson import Binary

def verify_mongo_connection(mongoClient: pymongo.MongoClient):
    try:
        mongoClient.admin.command('ping')
    except ConnectionFailure as err:
        # just use a generic exception
        raise Exception("MongoDB server not available/unreachable") from err
    
def upload_experiment_aggregated_results(experimentId: str, results: str, mongoClient: pymongo.MongoClient):
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
    
def upload_experiment_zip(experimentId: str, encoded: Binary, mongoClient: pymongo.MongoClient):
    experimentZipEntry = {"_id": experimentId, "fileContent": encoded}
    zipCollection = mongoClient["gladosdb"].zips
    try:
        # TODO: Refactor to call the backend
        resultZipId = zipCollection.insert_one(experimentZipEntry).inserted_id
        return resultZipId
    except Exception as err:
        raise Exception("Encountered error while storing results zip in MongoDB") from err
    
def upload_log_file(experimentId: str, contents: str, mongoClient: pymongo.MongoClient):
    logFileEntry = {"_id": experimentId, "fileContent": contents}
    logCollection = mongoClient["gladosdb"].logs
    try:
        resultId = logCollection.insert_one(logFileEntry).inserted_id
        return resultId
    except Exception as err:
        raise Exception("Encountered error while storing log file in MongoDB") from err
    
def check_insert_default_experiments(mongoClient: pymongo.MongoClient):
    # this gets run on its own thread, so let it try to enter the default experiments
    def insertExperiments():
        defaultExperimentCollection = mongoClient["gladosdb"].defaultExperiments
        experiments = [
            # python experiments
            {"name": "addNums.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNums.py"},
            {"name": "addNumsFailsOnXis1Yis5.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNumsFailsOnXis1Yis5.py"},
            {"name": "addNumsTimeOutOnXis1Yis5.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNumsTimeOutOnXis1Yis5.py"},
            {"name": "addNumsTimed.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNumsTimed.py"},
            {"name": "addNumsWithConstants.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNumsWithConstants.py"},
            {"name": "alwaysFail.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/alwaysFail.py"},
            {"name": "genetic_algorithm.py", "type": "python", "url": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/genetic_algorithm.py"}
            # C experiments
            # Java experiments
        ]
        
        for exp in experiments:
            count = defaultExperimentCollection.count_documents({"name": exp["name"]})
            if count == 0:
                defaultExperimentCollection.insert_one(exp)
                
    try:
        insertExperiments()
    except:
        # keep trying
        check_insert_default_experiments(mongoClient)