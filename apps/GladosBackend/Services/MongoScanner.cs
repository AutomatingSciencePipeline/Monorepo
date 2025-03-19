using GladosBackend.Configs;
using GladosBackend.Configs.Models;
using GladosBackend.Models;
using k8s;
using k8s.Models;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace GladosBackend.Services
{
    public class MongoScanner : BackgroundService
    {
        private readonly CancellationTokenSource _cancellationTokenSource;
        private readonly IMongoDatabase _database;
        private readonly ILogger<MongoScanner> _logger;

        public MongoScanner(ILogger<MongoScanner> logger)
        {
            _logger = logger;
            var connString = "glados-service-mongodb";
            // Get port from environment variable called MONGODB_PORT
            var port = Environment.GetEnvironmentVariable("MONGODB_PORT") ?? "12345";
            // Get username from environment variable called MONGODB_USERNAME
            var username = Environment.GetEnvironmentVariable("MONGODB_USERNAME") ?? "test";
            // Get password from environment variable called MONGODB_PASSWORD
            var password = Environment.GetEnvironmentVariable("MONGODB_PASSWORD") ?? "test";
            // Set replica set name to "rs0"
            var replicaSetName = "rs0";

            // Connect to the MongoDB server
            var client =
                new MongoClient(
                    $"mongodb://{username}:{password}@{connString}:{port}/?replicaSet={replicaSetName}&serverSelectionTimeout=10s");
            _database = client.GetDatabase("gladosdb");
            _cancellationTokenSource = new CancellationTokenSource();
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            return StartScanning();
        }

        public Task StartScanning()
        {
            return Task.Run(async () =>
            {
                var collection = _database.GetCollection<BsonDocument>("experiments");
                // Check for experiments with the status CREATED
                var filter = Builders<BsonDocument>.Filter.Eq("status", "CREATED");
                var update = Builders<BsonDocument>.Update.Set("status", "RUNNING");

                // As each experiment is updated, the status will change to RUNNING
                // This will prevent the experiment from being picked up by another worker
                // Now we need to spawn a new worker to run the experiment
                using (var cursor = await collection.FindAsync(filter))
                {
                    while (await cursor.MoveNextAsync())
                    {
                        var batch = cursor.Current;
                        foreach (var document in batch)
                        {
                            var id = document["_id"].AsObjectId;
                            var name = document["name"].AsString;
                            _logger.LogInformation($"Starting experiment {name} with id {id}");
                            await collection.UpdateOneAsync(
                                Builders<BsonDocument>.Filter.Eq("_id", id),
                                update
                            );

                            _ = Task.Run(() =>
                            {
                                var experiment = BsonSerializer.Deserialize<Experiment>(document);
                                RunExperiment(experiment);
                            });
                        }
                    }
                }
            });
        }

        public void RunExperiment(Experiment experiment)
        {
            // Make sure the experiment data is valid
            if (experiment == null)
            {
                _logger.LogError("Experiment is null");
                return;
            }
            if (experiment.Id == null || experiment.File == null)
            {
                _logger.LogError("Experiment file is null");
                return;
            }

            // Change the current working directory to be the experiment id
            Directory.CreateDirectory(experiment.Id);
            Directory.SetCurrentDirectory(experiment.Id);

            // Start a new worker to run the experiment
            // The worker will be spawned as a k8s pod
            var config = KubernetesClientConfiguration.BuildDefaultConfig();
            var client = new Kubernetes(config);
            var yamlFilePath = "/job-runner.yaml";
            string yamlContent = File.ReadAllText(yamlFilePath);

            // Deserialize YAML to C# object
            var pod = KubernetesYaml.Deserialize<V1Pod>(yamlContent);

            pod.Metadata.Name = "runner-" + experiment.Id;

            // Just call the dotnet command to run the GladosRunner.dll
            // TODO: Determine if this is actually needed, the image should be built with the correct entrypoint
            // pod.Spec.Containers[0].Command = ["dotnet", "GladosRunner.dll"];

            // Check the users role
            // Admins do not have any resource limits
            if (experiment.CreatorRole == "user")
            {
                // Set strict resource limits for pod
                pod.Spec.Containers[0].Resources = new V1ResourceRequirements
                {
                    Limits = new Dictionary<string, ResourceQuantity>
                    {
                        { "cpu", new ResourceQuantity("4") },
                        { "memory", new ResourceQuantity("8Gi") }
                    },
                    Requests = new Dictionary<string, ResourceQuantity>
                    {
                        { "cpu", new ResourceQuantity("2") },
                        { "memory", new ResourceQuantity("4Gi") }
                    }
                };
            }
            else if (experiment.CreatorRole == "privileged")
            {
                // Set relaxed resource limits for pod if user is privileged
                pod.Spec.Containers[0].Resources = new V1ResourceRequirements
                {
                    Limits = new Dictionary<string, ResourceQuantity>
                    {
                        { "cpu", new ResourceQuantity("8") },
                        { "memory", new ResourceQuantity("16Gi") }
                    },
                    Requests = new Dictionary<string, ResourceQuantity>
                    {
                        { "cpu", new ResourceQuantity("4") },
                        { "memory", new ResourceQuantity("2Gi") }
                    }
                };
            }

            if (Environment.GetEnvironmentVariable("IMAGE_RUNNER") != null)
            {
                pod.Spec.Containers[0].Image = Environment.GetEnvironmentVariable("IMAGE_RUNNER");
            }

            // Set the start time of the experiment to current epoch milliseconds
            var startedAtEpochMillis = DateTimeOffset.UtcNow.ToUnixTimeSeconds() * 1000;
            // Set the experiments startedAtEpochMillis
            var filter = Builders<BsonDocument>.Filter.Eq("_id", experiment.Id);
            var update = Builders<BsonDocument>.Update
                .Set("startedAtEpochMillis", startedAtEpochMillis);
            var collection = _database.GetCollection<BsonDocument>("experiments");
            collection.UpdateOne(filter, update);

            // Parse the hyperparameters json
            var hyperparameters = JsonSerializer.Deserialize<Dictionary<string, object>>((string)experiment.Hyperparameters);
            if (hyperparameters == null)
            {
                _logger.LogError("Hyperparameters are null");
                // Set the experiment status to FAILED
                // Write some error message to the experiment log
                filter = Builders<BsonDocument>.Filter.Eq("_id", experiment.Id);
                update = Builders<BsonDocument>.Update
                    .Set("status", "FAILED");
                collection.UpdateOne(filter, update);

                // We are going to have to make a log file with bytes here
                var errorLogBytes = Encoding.UTF8.GetBytes("Error parsing hyperparameters. Contact an administrator.");
                var errorLogBucket = new GridFSBucket(_database, new GridFSBucketOptions
                {
                    BucketName = "logsBucket"
                });
                var errorLogId = errorLogBucket.UploadFromBytes("errorLog.txt", errorLogBytes, new GridFSUploadOptions
                {
                    Metadata = new BsonDocument
                    {
                        { "experimentId", experiment.Id }
                    }
                });
                return;
            }

            // Create a list to store the file names
            var fileNames = new List<string>();

            try
            {
                var parameters = new List<Parameter>();
                foreach (var key in hyperparameters.Keys)
                {
                    var json = JsonSerializer.Serialize(hyperparameters[key]);
                    var parameter = ConfigParser.ParseParameter(json);
                    parameters.Add(parameter);
                }

                // Now we need to generate all of the permutations of the hyperparameters
                var permutations = ConfigParser.GeneratePermutations(parameters);

                // Lets make a config folder to store the permutations
                Directory.CreateDirectory("config");
                // We need to create a new file for each permutation
                for (int i = 0; i < permutations.Count; i++)
                {
                    var fileName = $"config/config{i}";
                    fileNames.Add(fileName);
                    var text = ConfigParser.FormatPermutation(permutations[i], experiment.DumbTextArea);
                    File.WriteAllText(fileName, text);
                }
            }
            catch
            {
                // Set the experiment status to FAILED
                // Write some error message to the experiment log
                filter = Builders<BsonDocument>.Filter.Eq("_id", experiment.Id);
                update = Builders<BsonDocument>.Update
                    .Set("status", "FAILED");
                collection.UpdateOne(filter, update);

                // We are going to have to make a log file with bytes here
                var errorLogBytes = Encoding.UTF8.GetBytes("Error parsing hyperparameters. Contact an administrator.");
                var errorLogBucket = new GridFSBucket(_database, new GridFSBucketOptions
                {
                    BucketName = "logsBucket"
                });
                var errorLogId = errorLogBucket.UploadFromBytes("errorLog.txt", errorLogBytes, new GridFSUploadOptions
                {
                    Metadata = new BsonDocument
                    {
                        { "experimentId", experiment.Id }
                    }
                });
                return;
            }


            // Start the pod
            client.CreateNamespacedPod(pod, "default");

            // Wait until the pod is running
            while (true)
            {
                pod = client.ReadNamespacedPod(pod.Metadata.Name, "default");
                if (pod.Status.Phase == "Running")
                {
                    break;
                }
                Thread.Sleep(500);
            }

            // Copy all of the config files to the pod
            foreach (var fileName in fileNames)
            {
                var configBytes = File.ReadAllBytes(fileName);
                CopyFileToPod(client, pod.Metadata.Name, configBytes, $"/experiment/config/{Path.GetFileName(fileName)}");
            }

            // Convert the experiment to a JSON string
            var experimentJson = JsonSerializer.Serialize(experiment);
            // Convert the experiment JSON to a byte array
            var experimentBytes = Encoding.UTF8.GetBytes(experimentJson);
            // Send that to the pod
            try
            {
                CopyFileToPod(client, pod.Metadata.Name, experimentBytes, "/experiment/experiment.json");
            }
            catch (Exception e)
            {
                _logger.LogError(e.Message);
                return;
            }

            // Get the experiment file as a byte array, this comes from a GridFS Bucket
            var filesBucket = new GridFSBucket(_database, new GridFSBucketOptions
            {
                BucketName = "filesBucket"
            });
            // Donwload based on the _id of the file
            var fileBytes = filesBucket.DownloadAsBytes(experiment.File);
            // Send that to the pod
            CopyFileToPod(client, pod.Metadata.Name, fileBytes, "/experiment/experimentFile");

            // Now the experiment is going to run, we are going to want to retrieve some files from the pod
            // We will watch for the files to be in the pod, then copy them to the backend
            // All of these will be asynchronous tasks, we will wait for them to return
            var tasks = new List<Task>
            {
                Task.Run(() => CopyFileFromPod(client, pod.Metadata.Name, $"/experiment/experimentResults.csv", "experimentResults.csv")),
                Task.Run(() => CopyFileFromPod(client, pod.Metadata.Name, "/experiment/experimentLog.txt", "experimentLog.txt")),
                Task.Run(() => CopyFileFromPod(client, pod.Metadata.Name, "/experiment/experiment.zip", "experiment.zip"))
            };
            if (experiment.TrialExtraFile != null)
            {
                tasks.Add(Task.Run(() => CopyFileFromPod(client, pod.Metadata.Name, $"/experiment/{experiment.TrialExtraFile}", "experimentExtraFile")));
            }
            // Wait for all of the tasks to complete
            Task.WaitAll(tasks.ToArray());

            // If experimentExtraFile is not null, we need to add it to the zip file
            if (experiment.TrialExtraFile != null)
            {
                using (var zip = ZipFile.Open("experiment.zip", ZipArchiveMode.Update))
                {
                    zip.CreateEntryFromFile("experimentExtraFile", experiment.TrialExtraFile);
                }
            }

            // Now we need to upload the files to the database
            var resultsBytes = File.ReadAllBytes("experimentResults.csv");
            var logBytes = File.ReadAllBytes("experimentLog.txt");
            var zipBytes = File.ReadAllBytes("experiment.zip");

            // These are all put into GridFS buckets
            var resultsBucket = new GridFSBucket(_database, new GridFSBucketOptions
            {
                BucketName = "resultsBucket"
            });
            var logBucket = new GridFSBucket(_database, new GridFSBucketOptions
            {
                BucketName = "logsBucket"
            });
            var zipBucket = new GridFSBucket(_database, new GridFSBucketOptions
            {
                BucketName = "zipsBucket"
            });

            // Upload the files, make sure to store the expdId in the metadata
            var resultsId = resultsBucket.UploadFromBytes($"{experiment.Id}Results.csv", resultsBytes, new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "experimentId", experiment.Id }
                }
            });

            var logId = logBucket.UploadFromBytes($"{experiment.Id}Log.txt", logBytes, new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "experimentId", experiment.Id }
                }
            });

            var zipId = zipBucket.UploadFromBytes($"{experiment.Id}experiment.zip", zipBytes, new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "experimentId", experiment.Id }
                }
            });

            // Set the filter here
            filter = Builders<BsonDocument>.Filter.Eq("_id", experiment.Id);

            // Set the finishedAtEpoch to the current time
            var finishedAtEpoch = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // Update the experiment with the results
            collection = _database.GetCollection<BsonDocument>("experiments");
            update = Builders<BsonDocument>.Update
                .Set("status", "COMPLETED");
            collection.UpdateOne(filter, update);
        }

        private static void CopyFileToPod(Kubernetes client, string podName, byte[] bytes, string destinationPath)
        {
            // Get the pod
            var pod = client.ReadNamespacedPod(podName, "default");
            // Write the bytes to a temp file
            var tempFile = Path.GetTempFileName();
            File.WriteAllBytes(tempFile, bytes);
            // Execute the copy command
            var copyCommand = new List<string>
            {
                "kubectl",
                "cp",
                tempFile,
                $"{pod.Metadata.Name}:{destinationPath}"
            };
            var copyCommandString = string.Join(" ", copyCommand);
            var copyCommandProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "kubectl",
                    Arguments = copyCommandString,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            copyCommandProcess.Start();
            copyCommandProcess.WaitForExit();
            // Clean up the temp file
            File.Delete(tempFile);
        }

        // This method will watch for a file to be in the pod
        private static void CopyFileFromPod(Kubernetes client, string podName, string sourcePath, string destinationPath)
        {
            // Check if the file exists
            var command = new List<string>
            {
                "kubectl",
                "exec",
                podName,
                "--",
                "test",
                "-f",
                sourcePath
            };
            var commandString = string.Join(" ", command);
            var commandProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "kubectl",
                    Arguments = commandString,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            commandProcess.Start();
            commandProcess.WaitForExit();
            // If it does not exist, loop until it does
            while (commandProcess.ExitCode != 0)
            {
                commandProcess.Start();
                commandProcess.WaitForExit();
                Thread.Sleep(1000);
            }
            // If it does exist, copy it to the destination
            var copyCommand = new List<string>
            {
                "kubectl",
                "cp",
                $"{podName}:{sourcePath}",
                destinationPath
            };
            var copyCommandString = string.Join(" ", copyCommand);
            var copyCommandProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "kubectl",
                    Arguments = copyCommandString,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            copyCommandProcess.Start();
            copyCommandProcess.WaitForExit();
            // Now delete the file from the pod
            var deleteCommand = new List<string>
            {
                "kubectl",
                "exec",
                podName,
                "--",
                "rm",
                sourcePath
            };
            var deleteCommandString = string.Join(" ", deleteCommand);
            var deleteCommandProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "kubectl",
                    Arguments = deleteCommandString,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            deleteCommandProcess.Start();
            deleteCommandProcess.WaitForExit();
        }

    }
}