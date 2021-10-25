from pymongo import MongoClient
from pprint import pprint
client = MongoClient("mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=mongodb")
db=client.mydb

#serverStatusResult=db.command("serverStatus")
#pprint(serverStatusResult)

ExperimentTest = {'Name' : "test1",
        'ID': 1,
        'Results' : "RANDOM DATA HERE :D"}
result = db.Experiment.insert_one(ExperimentTest)
print('inserted')
 
exper = db.Experiment.find_one({'ID': 1})
print(exper)
