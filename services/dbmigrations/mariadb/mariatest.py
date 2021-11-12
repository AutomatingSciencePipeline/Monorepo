
import mariadb
import sys

conn = mariadb.connect(
        user = "root",
        password = "Wandkeer0",
        host = "192.0.2.1",
        port = "3306", 
        database = "CompPipelineDB")
expect mariadb.Error as e:
    print(f"Error connecting to mariaDB platform: {e}")
    sys.exit(1)

    cur = conn.cursor()

    cursor.execute("INSERT INTO Experiment (Name, ID, Status) VALUES (?, ?, ?)", ("Test", 1, 1))

    cur.execute("SELECT Name FROM Experiment")
    for (Name) in cur:
        print(f"Experiments Name: {Name}")
