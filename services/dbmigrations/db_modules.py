from pymongo import MongoClient
from pprint import pprint
import mariadb
import sys

def CreateExperiment(Name, Status, User, newID):
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        statement = "INSERT INTO Experiment (Name, Status, User) VALUES (%s, %s, %s);"
        data = (Name, Status, User)
        curs.execute(statement, data)        
        conn.commit()
        curs.execute("SELECT ID FROM Experiment where Name = ?",(Name,))
        for(ID) in curs:
            return ID[0]
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)


def FindMaria(ID):
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        curs.execute("SELECT * FROM Experiment where ID = ?",(ID,))
        for(ID, User, Name, CreationDate, Status, NoSQLKEY) in curs:
            return [str(ID), User, Name, str(CreationDate), Status, str(NoSQLKEY)]
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)


def UpdateKey(Key, Name):
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        curs.execute("UPDATE Experiment  SET NoSQLKEY = ? WHERE Name = ?;",(Key,Name,))
        conn.commit()
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)



def UpdateName(ID, Name):
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        curs.execute("UPDATE Experiment  SET Name = ? WHERE ID = ?;",(Name,ID,))
        conn.commit()
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)



def UpdateStatus(Status, Name):
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        curs.execute("UPDATE Experiment  SET Status = ? WHERE Name = ?;",(Status,Name,))
        conn.commit()
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)


def InsertResults(Name, Results, NewID):
    client = MongoClient("mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=mongodb")
    db=client['mydb']
    ExperimentTest = {'Name' : Name,
        'Results' : Results}
    return db.Experiment.insert_one(ExperimentTest).inserted_id
    
def RemoveExperiment(ID):
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        curs.execute("Delete FROM Experiment  WHERE ID = ?;",(ID,))
        conn.commit()
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)

def ShowAll():
    try:
        conn = mariadb.connect(
        user = "root",
        password = "GladosPass",
        host = "localhost",
        port = 3306
        )
        curs = conn.cursor()
        curs.execute("use demo;")
        curs.execute("Select * from Experiment")
        allthings = []
        for(ID, User, Name, CreationDate, Status, NoSQLKEY) in curs:
             allthings.append([str(ID), User, Name, str(CreationDate), Status, str(NoSQLKEY)])
        return allthings
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)



def FindMongo(Name):
    client = MongoClient("mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=mongodb")
    db=client['mydb']
    exper = db.Experiment.find_one({'Name': Name})
    return exper

def InitDatabases():
    client = MongoClient("mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=mongodb")
    db=client.mydb
    try:
        print('trying to connect with db')
        conn = mariadb.connect(
            user = "root",
            password = "GladosPass",
            host = "localhost",
            port = 3306
        )
        print('connection works')
    except mariadb.Error as e:
        print(f"Error connecting to mariaDB platform: {e}")
        sys.exit(1)

    cur = conn.cursor()
    cur.execute("DROP DATABASE IF EXISTS demo;")
    cur.execute("CREATE DATABASE demo;")
    cur.execute("use demo;")
    cur.execute("CREATE TABLE IF NOT EXISTS Experiment (ID int NOT NULL AUTO_INCREMENT, User varchar(255), Name varchar(255), CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, Status varchar(255), NoSQLKEY varchar(255), PRIMARY KEY(ID));")
    cur.execute("CREATE TABLE  IF NOT EXISTS Job_Server (ID int NOT NULL, Online Boolean, CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(ID));")
    cur.execute("CREATE TABLE IF NOT EXISTS Job (ID int NOT NULL, Experiment int, Machine int, ForeignKey int NOT NULL, CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(ID), FOREIGN KEY (Machine) REFERENCES Job_Server(ID), FOREIGN KEY (Experiment) REFERENCES Experiment(ID));")



    
    
