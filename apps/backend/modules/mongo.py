import json
import pymongo
from pymongo.errors import ConnectionFailure
from bson import Binary, ObjectId
from gridfs import GridFSBucket

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
        
def download_experiment_file(expId: str, mongoClient: pymongo.MongoClient):
    # we are going to have to get the binary data from mongo here
    # setup the bucket
    db = mongoClient["gladosdb"]
    bucket = GridFSBucket(db, bucket_name='fileBucket')
    files = bucket.find({"metadata.expId": expId}).to_list()
    num_files = 0
    file_name = ""
    for file in files:
        num_files += 1
        if num_files > 1:
            raise Exception("There are more than 1 file for a single experiment!")        
        file_name = file.filename
    if file_name == "":
        raise Exception("No file found!")
    file = bucket.open_download_stream_by_name(file_name)
    contents = file.read()
    return contents.decode("utf-8")

def get_experiment(expId: str, mongoClient: pymongo.MongoClient):
    experimentsCollection = mongoClient["gladosdb"].experiments
    experiment = experimentsCollection.find_one({"_id": ObjectId(expId)})
    if experiment is None:
        raise Exception("Could not find experiment!")
    return experiment["name"]
