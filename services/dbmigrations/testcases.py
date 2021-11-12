from mariatest import *
#if you want to run this you need 
#  1. Mariadb Installed
#  2. Mongo DB instaled
#  3. Password for maria db root needs to be "GladosPass" 
InitDatabases()
print("initualization complete")
test = 0
print("MONGO INSERT TEST Should  added object address")
print(InsertResults("test1", "this is a bunch of data",test))
print("MONGO FETCH DATA TEST Should print all objects data")
print(FindMongo("test1"))

print("MARIA  INSERT TEST should print ID of new experiment")
print(CreateExperiment("experimenttest","Initiallized","wandke",test))
print(CreateExperiment("experimenttest2","Initiallized","wandke",test))
print("MARIA TEST FETCH DATA should print list of ID, user, name, creationdate, status, nosqlkey")
print(FindMaria("1"))
print("UPDATE STATUS TEST should show same data except with updated status")
UpdateStatus("finished","experimenttest")
print(FindMaria("1"))
print("UPDATE NOSQLKEY TEST Same info with no sql key")
UpdateKey(str(InsertResults("experimenttest", "yay data results yay",test)),"experimenttest")
print(FindMaria("1"))
print("UPDATE NAME TEST Same info with new name")
UpdateName(1, "simplername")
print(FindMaria("1"))
print("TEST SHOW ALL");
print(ShowAll());
print("TEST remove experiment removing experiment 2 then showing all")
RemoveExperiment(2)
print(ShowAll());
