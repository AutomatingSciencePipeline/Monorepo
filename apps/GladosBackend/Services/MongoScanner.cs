using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace GladosBackend.Services
{
    public class MongoScanner
    {
        private readonly CancellationTokenSource _cancellationTokenSource;
        private readonly IMongoDatabase _database;
        private readonly ILogger<MongoScanner> _logger;

        public MongoScanner(ILogger<MongoScanner> logger)
        {
            _logger = logger;
            var connString = "glados-service-mongodb";
            // Get port from environment variable called MONGODB_PORT
            var port = Environment.GetEnvironmentVariable("MONGODB_PORT");
            // Get username from environment variable called MONGODB_USERNAME
            var username = Environment.GetEnvironmentVariable("MONGODB_USERNAME");
            // Get password from environment variable called MONGODB_PASSWORD
            var password = Environment.GetEnvironmentVariable("MONGODB_PASSWORD");
            // Set replica set name to "rs0"
            var replicaSetName = "rs0";
            // set server selection timeout to 10 seconds
            var serverSelectionTimeout = TimeSpan.FromSeconds(10);

            // Connect to the MongoDB server
            var client = new MongoClient($"mongodb://{username}:{password}@{connString}:{port}/?replicaSet={replicaSetName}&serverSelectionTimeout={serverSelectionTimeout.TotalSeconds}s");
            _database = client.GetDatabase("glados");
            _cancellationTokenSource = new CancellationTokenSource();
            StartScanning();
        }

        public void StartScanning()
        {
            Task.Run(async () =>
            {
                var collection = _database.GetCollection<BsonDocument>("experiments");
                // Check for experiments with the status CREATED
                var filter = Builders<BsonDocument>.Filter.Eq("status", "CREATED");
                var update = Builders<BsonDocument>.Update.Set("status", "RUNNING");
                var options = new FindOptions<BsonDocument>
                {
                    CursorType = CursorType.TailableAwait,
                    OplogReplay = true
                };
                var cursor = await collection.FindAsync(filter, options, _cancellationTokenSource.Token);
                while (await cursor.MoveNextAsync())
                {
                    foreach (var doc in cursor.Current)
                    {
                        _logger.LogInformation(doc.ToString());
                    }
                }
            });
        }

        public void StopScanning()
        {
            _cancellationTokenSource.Cancel();
        }

    
    }
}