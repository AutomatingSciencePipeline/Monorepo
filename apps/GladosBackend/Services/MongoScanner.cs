using k8s;
using k8s.Models;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using System.Diagnostics;
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
            _database = client.GetDatabase("glados");
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
                                StartWorker(experiment);
                            });
                        }
                    }
                }
            });
        }

        public void StopScanning()
        {
            _cancellationTokenSource.Cancel();
        }

        public void StartWorker(Experiment experiment)
        {
            // Start a new worker to run the experiment
            // The worker will be spawned as a k8s pod
            var config = KubernetesClientConfiguration.BuildDefaultConfig();
            var client = new Kubernetes(config);
            var yamlFilePath = "job-runner.yaml";
            string yamlContent = File.ReadAllText(yamlFilePath);

            // Deserialize YAML to C# object
            var pod = KubernetesYaml.Deserialize<V1Pod>(yamlContent);

            pod.Metadata.Name = "runner-" + experiment.Id;

            // TODO: Figure out what will be sent to the runner.
            pod.Spec.Containers[0].Command = new List<string> { "python", "run_experiment.py" };

            if (Environment.GetEnvironmentVariable("IMAGE_RUNNER") != null)
            {
                pod.Spec.Containers[0].Image = Environment.GetEnvironmentVariable("IMAGE_RUNNER");
            }

            // Get the experiment file as a byte array
            var collection = _database.GetCollection<BsonDocument>("files");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", experiment.fil);

            // Create the job
            // _ = new PodManager(client.CreateNamespacedPod(pod, "default"));
            Task.Run(() =>
            {
                _ = new PodManager(client.CreateNamespacedPod(pod, "default"), experiment);
            });
        
        }
    }
}