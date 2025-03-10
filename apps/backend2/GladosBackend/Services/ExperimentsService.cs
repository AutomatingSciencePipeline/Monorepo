// This controller will be used to watch the mongo db and start a running pod when a new document is added to the database.

using k8s;
using k8s.Models;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Text.Json;

namespace GladosBackend.Services
{
    public class ExperimentsService : IHostedService
    {
        private readonly ILogger<ExperimentsService> _logger;

        public ExperimentsService(ILogger<ExperimentsService> logger)
        {
            _logger = logger;
        }
        private void ListenToMongo()
        {
            // Username, password, port come from env vars
            var username = Environment.GetEnvironmentVariable("MONGODB_USERNAME");
            var password = Environment.GetEnvironmentVariable("MONGODB_PASSWORD");
            var port = Environment.GetEnvironmentVariable("MONGODB_PORT");
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(port))
            {
                throw new Exception("MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_PORT env vars must be set");
            }
            // Make sure port is a number
            if (!int.TryParse(port, out _))
            {
                throw new Exception("MONGODB_PORT must be a number");
            }
            var mongoClient = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress("glados-service-mongodb", int.Parse(port)),
                Credential = MongoCredential.CreateCredential("admin", username, password),
                ReplicaSetName = "rs0",
                ServerSelectionTimeout = TimeSpan.FromSeconds(5)
            });
            var database = mongoClient.GetDatabase("gladosdb");
            var _collection = database.GetCollection<BsonDocument>("experiments");

            // Start watching the collection
            var options = new ChangeStreamOptions { FullDocument = ChangeStreamFullDocumentOption.UpdateLookup };
            var pipeline = new EmptyPipelineDefinition<ChangeStreamDocument<BsonDocument>>().Match("{ operationType: { $in: [ 'insert' ] } }");
            var cursor = _collection.Watch(pipeline, options);
            cursor.ForEachAsync(change =>
            {
                _logger.LogInformation("New document added to the collection");
                Console.WriteLine("New document added to the collection");
                var document = JsonDocument.Parse(change.FullDocument.ToJson());
                Task.Run(() => StartPod(document));
            });
        }

        private void StartPod(JsonDocument document)
        {
            // Start a pod, the yaml file is stored at ../job-runner.yaml
            // Use the kubernetes client to start the pod
            var config = KubernetesClientConfiguration.BuildDefaultConfig();
            var client = new Kubernetes(config);
            
            var jobName = "runner-" + document.RootElement.GetProperty("id").GetString();
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("ExperimentsService is starting.");
            ListenToMongo();
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("ExperimentsService is stopping.");
            return Task.CompletedTask;
        }
    }
}