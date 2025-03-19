// Start a logger to use
using System.Net.Sockets;
using System.Text;
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
}
finally
{
    Log.CloseAndFlush();
}