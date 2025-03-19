using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Experiment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("hyperparameters")]
    public BsonDocument? Hyperparameters { get; set; }

    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("trialExtraFile")]
    public string? TrialExtraFile { get; set; }

    [BsonElement("trialResult")]
    public string? TrialResult { get; set; }
    
    [BsonElement("trialResultLineNumber")]
    public int TrialResultLineNumber { get; set; }

    [BsonElement("scatterIndVar")]
    public string? ScatterIndVar { get; set; }

    [BsonElement("scatterDepVar")]
    public string? ScatterDepVar { get; set; }

    [BsonElement("dumbTextArea")]
    public string? DumbTextArea { get; set; }

    [BsonElement("timeout")]
    public int Timeout { get; set; }

    [BsonElement("verbose")]
    public bool Verbose { get; set; }

    [BsonElement("scatter")]
    public bool Scatter { get; set; }

    [BsonElement("keepLogs")]
    public bool KeepLogs { get; set; }

    [BsonElement("workers")]
    public int Workers { get; set; }

    [BsonElement("file")]
    public string? File { get; set; }

    [BsonElement("status")]
    public string? Status { get; set; }

    [BsonElement("experimentExecutable")]
    public string? ExperimentExecutable { get; set; }

    [BsonElement("creator")]
    public string? Creator { get; set; }

    [BsonElement("creatorEmail")]
    public string? CreatorEmail { get; set; }

    [BsonElement("creatorRole")]
    public string? CreatorRole { get; set; }

    [BsonElement("created")]
    [BsonRepresentation(BsonType.Int64)]
    public long Created { get; set; }

    [BsonElement("finished")]
    public bool Finished { get; set; }

    [BsonElement("estimatedTotalTimeMinutes")]
    public double EstimatedTotalTimeMinutes { get; set; }

    [BsonElement("totalExperimentRuns")]
    public int TotalExperimentRuns { get; set; }

    [BsonElement("startedAtEpochMillis")]
    [BsonRepresentation(BsonType.Int64)]
    public long StartedAtEpochMillis { get; set; }

    [BsonElement("passes")]
    public int Passes { get; set; }

    [BsonElement("finishedAtEpochMilliseconds")]
    [BsonRepresentation(BsonType.Int64)]
    public long FinishedAtEpochMilliseconds { get; set; }
}