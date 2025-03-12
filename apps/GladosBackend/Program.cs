using GladosBackend.Services;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<MongoScanner>();

var host = builder.Build();
host.Run();