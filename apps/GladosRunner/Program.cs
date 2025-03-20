// Start a logger to use
using System.IO.Compression;
using Serilog;

// Setup a logger to write to the console and a file
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("/runnerLog.txt")
    .CreateLogger();

try
{
    Runner.Run();
}
catch (Exception ex)
{
    Log.Error(ex, "An error occurred");

    // Create an empty result file
    File.WriteAllText("/experiment/experimentResults.csv", "Error");

    Directory.CreateDirectory("/emptyDir");

    // Create an empty zip file
    ZipFile.CreateFromDirectory("/emptyDir", "/experiment/experiment.zip");
}
finally
{
    Log.CloseAndFlush();
    // Copy the log file to the output log file
    File.Copy("/runnerLog.txt", "/experiment/experimentLog.txt");

    // Wait fo the /experiment/experimentLog.txt file to be deleted
    while (File.Exists("/experiment/experimentLog.txt"))
    {
        Thread.Sleep(1000);
    }
}