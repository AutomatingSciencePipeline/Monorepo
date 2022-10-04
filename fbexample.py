from genericpath import isdir
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
import itertools
import configparser
import os
# cred = credentials.Certificate("Monorepo/creds.json")

# app = firebase_admin.initialize_app(cred)

# db = firestore.client()
# bucket = storage.bucket("gladosbase.appspot.com")
def frange(start, stop, step=None):
    if step == None:
        step = 1.0
    count = 0
    while True:
        temp = float(start + count * step)
        if temp >= stop:
            break
        yield temp
        count += 1

if __name__ == "__main__":
    print("Hello world")
    # blob = bucket.blob("creds.json")
    # blob.upload_from_filename("Monorepo/creds.json")
    # blob = bucket.blob("creds.json")
    # blob.download_to_filename("Monorepo/creds2.json") 
    # testDocs = db.collection('Test')
    # ref = testDocs.document('1e3fXj61mga2CiaEgwjM')
    # doc = ref.get().to_dict()
    # filename = doc['filename']
    # blob = bucket.blob(filename)
    # blob.download_to_filename("Monorepo/"+filename)
    # experiments = db.collection('Experiments')
    # id = "1wzgrDfUxS5XQWlVxW6V"
    # print(f'recieved {id}')
    # expRef = experiments.document(id)
    # experiment = expRef.get().to_dict()
    # print(f"Experiment info {experiment}")

    # print(f'Downloading file for {id}')
    # filepath = experiment['file']
    # print(f"downloading {filepath} to Monorepo/ExperimentFiles/{filepath}")
    # filedata = bucket.blob(filepath)
    # filedata.download_to_filename(f"Monorepo/ExperimentFiles/{filepath}")
    
    hyper = [{"name":"x","default":"1","min":"1","max":"10","step":"1","type":"integer"},
    {"name":"y","default":"1","min":"1","max":"10","step":"1","type":"integer"},
    {'name':'z','default':'0','min':'0','max':'.6','step':'.2','type':'float'}]
    configNum = 0
    for defaultVar in hyper:
        if defaultVar['type'] == 'string':
            continue
        paramspos = []
        default = [(defaultVar['name'],defaultVar['default'])]
        paramspos.append(default)
        for otherVar in hyper:
            if otherVar['name'] != defaultVar['name']:
                if otherVar['type'] == 'integer':
                    paramspos.append([(otherVar['name'],i) for i in range(int(otherVar['min']),int(otherVar['max']),int(otherVar['step']))])
                if otherVar['type'] == 'float':
                    paramspos.append([(otherVar['name'],i) for i in frange(float(otherVar['min']),float(otherVar['max']),float(otherVar['step']))])
                if otherVar['type'] == 'string':
                    paramspos.append([(otherVar['name'],otherVar['default'])])
                if otherVar['type'] == 'boolean':
                    paramspos.append([(otherVar['name'],val) for val in [True,False]])

        perms = list(itertools.product(*paramspos))
        # print(perms)
        for perm in perms:
            config = configparser.ConfigParser()
            res = {}
            for var in perm:
                res[var[0]] = var[1]
            config['DEFAULT'] = res
            if not(os.path.isdir('configtests')):
                os.mkdir('configtests')
            with open(f'configtests/config{configNum}.ini', 'w') as configFile:
                config.write(configFile)
                configFile.close()
            configNum += 1


# for i in frange(0,1,0.1):
#     print(i)
    # print(list(itertools.product(*s)))