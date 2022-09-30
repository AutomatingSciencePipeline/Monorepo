import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage


cred = credentials.Certificate("Monorepo/creds.json")

app = firebase_admin.initialize_app(cred)

db = firestore.client()
bucket = storage.bucket("gladosbase.appspot.com")


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
    experiments = db.collection('Experiments')
    id = "1wzgrDfUxS5XQWlVxW6V"
    print(f'recieved {id}')
    expRef = experiments.document(id)
    experiment = expRef.get().to_dict()
    print(f"Experiment info {experiment}")

    print(f'Downloading file for {id}')
    filepath = experiment['file']
    print(f"downloading {filepath} to Monorepo/ExperimentFiles/{filepath}")
    filedata = bucket.blob(filepath)
    filedata.download_to_filename(f"Monorepo/ExperimentFiles/{filepath}")
    