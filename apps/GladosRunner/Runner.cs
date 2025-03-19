using System;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using Serilog;
using System.Threading;
using System.IO;

class Runner
{
    public static void Run()
    {
        Log.Information("Starting runner!");

        try
        {
            // Wait for the experiment to be downloaded
            Log.Information("Waiting for experiment to be downloaded...");
            while (!File.Exists("/experiment/experiment.json"))
            {
                Thread.Sleep(1000);
            }
            
            // Deserialize the experiment object from /experiment/experiment.json
            var experiment = JsonSerializer.Deserialize<Experiment>(File.ReadAllText("/experiment/experiment.json"));
            if (experiment == null)
            {
                Log.Error("Failed to deserialize experiment.");
                return;
            }
            Log.Information("Experiment: {experiment}", experiment);
            Log.Information("Experiment name: {name}", experiment.Name);

            // Decide what the experiment file type is
            var filePath = "/experiment/experimentFile";
            var fileType = GetFileType(filePath);
            Log.Information("File type: {fileType}", fileType);

            // If the file is a ZIP we need to unzip it
            if (fileType == FileType.Zip)
            {
                Log.Information("Unzipping file...");
                System.IO.Compression.ZipFile.ExtractToDirectory(filePath, "/experiment");

                if (experiment.ExperimentExecutable == null)
                {
                    Log.Error("No experiment executable found.");
                    return;
                }

                // Check the file type based on what is in the experiment file
                fileType = GetFileType(experiment.ExperimentExecutable);
            }

            

            
        }
        catch (Exception ex)
        {
            Log.Error("Error occurred: {Message}", ex.Message);
        }
        finally
        {
            Log.Information("Runner stopped.");
        }
    }

    private static FileType GetFileType(string path)
    {
        // Use the linux file command to determine the file type
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "file",
                Arguments = $"-b \"{path}\"", // Removes MIME type flag to get full description
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using Process process = new() { StartInfo = psi };
            process.Start();

            string result = process.StandardOutput.ReadToEnd().Trim().ToLower();
            process.WaitForExit();

            if (result.Contains("python script") || result.Contains("python3"))
            {
                return FileType.Python;
            }
            else if (result.Contains("java archive data (jar)"))
            {
                return FileType.Java;
            }
            else if (result.Contains("ELF 64-bit LSB".ToLower()))
            {
                return FileType.C;
            }
            else if (result.Contains("zip archive"))
            {
                return FileType.Zip;
            }

            Log.Logger.Warning("Unknown file type: {result}", result);

            return FileType.Unknown;
        }
        catch (Exception ex)
        {
            Log.Logger.Warning("Error calculating file type! " + ex.Message);
            return FileType.Unknown;
        }
    }

    enum FileType{
        Python,
        Java,
        C,
        Zip,
        Unknown
    }
}
