namespace GladosBackend.Controllers;

using System.Text.Json;
using GladosBackend.Models;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

[ApiController]
[Route("backend")]
public class BackendController : ControllerBase
{

    private readonly ILogger<BackendController> _logger;
    private readonly IMongoDatabase _database;

    public BackendController(ILogger<BackendController> logger)
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

        // Connect to the MongoDB server
        var client =
            new MongoClient(
                $"mongodb://{username}:{password}@{connString}:{port}/?replicaSet={replicaSetName}&serverSelectionTimeout=10s");
        _database = client.GetDatabase("gladosdb");
    }

    // Write a post that takes in a json string
    [HttpPost("incrementExperiment")]
    public IActionResult IncrementExperiment([FromBody] string json)
    {   
        // Get expId from json
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        var expId = dict["expId"].ToString();
        // Increment the "passes" field of the experiment with the given expId
        try
        {
            var filter = Builders<BsonDocument>.Filter.Eq("expId", expId);
            var experiment = _database.GetCollection<BsonDocument>("experiments")
                .Find(filter).FirstOrDefault();
            if (experiment == null)
            {
                return NotFound();
            }
            var count = experiment["passes"].AsInt32 + 1;
            var update = Builders<BsonDocument>.Update.Set("passes", count);
            _database.GetCollection<BsonDocument>("experiments").UpdateOne(filter, update);
            return Ok();
        }
        catch (Exception e)
        {
            return NotFound();
        }
    }

}