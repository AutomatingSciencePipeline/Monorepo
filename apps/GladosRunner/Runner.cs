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

                // Check for the "userProvidedFileReqs.txt" file
                if (File.Exists("userProvidedFileReqs.txt"))
                {
                    // Run pip install -r userProvidedFileReqs.txt
                    ProcessStartInfo pipProcessInfo = new ProcessStartInfo
                    {
                        FileName = "pip",
                        Arguments = $"install -r userProvidedFileReqs.txt",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };

                    Process pipProcess = new() { StartInfo = pipProcessInfo };
                    pipProcess.Start();

                    string pipOutput = pipProcess.StandardOutput.ReadToEnd();
                    string pipError = pipProcess.StandardError.ReadToEnd();
                    pipProcess.WaitForExit();

                    Log.Information("PIP Output: {output}", pipOutput);
                    Log.Information("PIP Error: {error}", pipError);
                }

                var userRole = experiment.CreatorRole;

                if (userRole == "admin" || userRole == "privileged")
                {
                    // Check if the file "packages.txt" exists
                    if (File.Exists("packages.txt"))
                    {
                        // Run apt-get install -y $(cat packages.txt)
                        ProcessStartInfo aptProcessInfo = new ProcessStartInfo
                        {
                            FileName = "apt-get",
                            Arguments = $"install -y $(cat packages.txt)",
                            RedirectStandardOutput = true,
                            RedirectStandardError = true,
                            UseShellExecute = false,
                            CreateNoWindow = true
                        };

                        Process aptProcess = new() { StartInfo = aptProcessInfo };
                        aptProcess.Start();

                        string aptOutput = aptProcess.StandardOutput.ReadToEnd();
                        string aptError = aptProcess.StandardError.ReadToEnd();
                        aptProcess.WaitForExit();

                        Log.Information("APT Output: {output}", aptOutput);
                        Log.Information("APT Error: {error}", aptError);
                    }

                    // Check if the file "commandsToRun.txt" exists
                    if (File.Exists("commandsToRun.txt"))
                    {
                        // Run the commands in the file
                        ProcessStartInfo bashProcessInfo = new ProcessStartInfo
                        {
                            FileName = "bash",
                            Arguments = $"commandsToRun.txt",
                            RedirectStandardOutput = true,
                            RedirectStandardError = true,
                            UseShellExecute = false,
                            CreateNoWindow = true
                        };

                        Process bashProcess = new() { StartInfo = bashProcessInfo };
                        bashProcess.Start();

                        string bashOutput = bashProcess.StandardOutput.ReadToEnd();
                        string bashError = bashProcess.StandardError.ReadToEnd();
                        bashProcess.WaitForExit();

                        Log.Information("Bash Output: {output}", bashOutput);
                        Log.Information("Bash Error: {error}", bashError);
                    }
                }
                else
                {
                    // Set the experiment executable to the file path
                    experiment.ExperimentExecutable = filePath;
                }

                // Check the file type based on what is in the experiment file
                fileType = GetFileType(experiment.ExperimentExecutable);
            }
            else
            {
                // Set the experiment executable to the file path
                experiment.ExperimentExecutable = filePath;
            }

            // Check if the file is a python file
            if (fileType == FileType.Python)
            {
                // Use pipreqs to generate a requirements.txt file
                ProcessStartInfo pipreqsProcessInfo = new ProcessStartInfo
                {
                    FileName = "pipreqs",
                    Arguments = $"/experiment",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process pipreqsProcess = new() { StartInfo = pipreqsProcessInfo };
                pipreqsProcess.Start();

                string pipreqsOutput = pipreqsProcess.StandardOutput.ReadToEnd();
                string pipreqsError = pipreqsProcess.StandardError.ReadToEnd();
                pipreqsProcess.WaitForExit();

                Log.Information("PIPreqs Output: {output}", pipreqsOutput);
                Log.Information("PIPreqs Error: {error}", pipreqsError);

                // Check if the file "requirements.txt" exists
                if (File.Exists("/experiment/requirements.txt"))
                {
                    // Run pip install -r requirements.txt
                    ProcessStartInfo pipProcessInfo = new ProcessStartInfo
                    {
                        FileName = "pip",
                        Arguments = $"install -r /experiment/requirements.txt",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };

                    Process pipProcess = new() { StartInfo = pipProcessInfo };
                    pipProcess.Start();

                    string pipOutput = pipProcess.StandardOutput.ReadToEnd();
                    string pipError = pipProcess.StandardError.ReadToEnd();
                    pipProcess.WaitForExit();

                    Log.Information("PIP Output: {output}", pipOutput);
                    Log.Information("PIP Error: {error}", pipError);
                }
            }

            var configFiles = Directory.GetFiles("/experiment/config");

            // Change to the experiment directory
            Directory.SetCurrentDirectory("/experiment");

            // Run the experiments in async tasks
            var tasks = new Task[configFiles.Length];
            for (int i = 0; i < configFiles.Length; i++)
            {
                tasks[i] = Task.Run(() => RunTrial(experiment, fileType, configFiles[i]));
            }
            Task.WaitAll(tasks);

            // Create the zip file
            Log.Information("Creating zip file...");



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

    private static void RunTrial(Experiment experiment, FileType fileType, string configFile)
    {
        Log.Information("Running trial with config file: {configFile}", configFile);
        bool completed = false;

        // Pull the trialnum from the config file
        var trialNum = Path.GetFileNameWithoutExtension(configFile).Replace("config", "");
        Log.Information("Trial number: {trialNum}", trialNum);

        string stdOut = string.Empty;
        string stdErr = string.Empty;

        // Change to a directory for this experiment
        Directory.CreateDirectory($"/experiment/trial{trialNum}");
        Directory.SetCurrentDirectory($"/experiment/trial{trialNum}");

        // Pass the config path as an argument to the experiment
        switch (fileType)
        {
            case FileType.Python:
                Log.Information("Running python experiment...");
                ProcessStartInfo pythonProcessInfo = new ProcessStartInfo
                {
                    FileName = "/usr/bin/unshare",
                    Arguments = $"--mount --net --pid --user --fork python3 " +
                        $"{experiment.ExperimentExecutable} {configFile}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process pythonProcess = new() { StartInfo = pythonProcessInfo };
                pythonProcess.Start();

                stdOut = pythonProcess.StandardOutput.ReadToEnd();
                stdErr = pythonProcess.StandardError.ReadToEnd();
                pythonProcess.WaitForExit();

                completed = true;
                break;
            case FileType.Java:
                Log.Information("Running java experiment...");
                ProcessStartInfo javaProcessInfo = new ProcessStartInfo
                {
                    FileName = "/usr/bin/unshare",
                    Arguments = $"--mount --net --pid --user --fork java -jar " +
                        $"{experiment.ExperimentExecutable} {configFile}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process javaProcess = new() { StartInfo = javaProcessInfo };
                javaProcess.Start();

                stdOut = javaProcess.StandardOutput.ReadToEnd();
                stdErr = javaProcess.StandardError.ReadToEnd();
                javaProcess.WaitForExit();

                completed = true;
                break;
            case FileType.C:
                Log.Information("Running C experiment...");
                ProcessStartInfo cProcessInfo = new ProcessStartInfo
                {
                    FileName = "/usr/bin/unshare",
                    Arguments = $"--mount --net --pid --user --fork " +
                        $"{experiment.ExperimentExecutable} {configFile}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process cProcess = new() { StartInfo = cProcessInfo };
                cProcess.Start();

                stdOut = cProcess.StandardOutput.ReadToEnd();
                stdErr = cProcess.StandardError.ReadToEnd();
                cProcess.WaitForExit();

                completed = true;
                break;
            default:
                Log.Error("Unknown file type.");
                break;
        }

        if (completed)
        {
            Log.Information("Trial {trialNum} completed.", trialNum);
            // Call to the backend api point to signal the trial is complete
            HttpClient client = new();
            var response = client.PostAsync("http://glados-backend:8080/backend/incrementExperiment", new StringContent(JsonSerializer.Serialize(new { expId = experiment.Id }))).Result;
            if (response.StatusCode != HttpStatusCode.OK)
            {
                Log.Error("Failed to increment experiment.");
            }

            // Write std out and std err to a single log file
            File.WriteAllText($"/experiment/logs/{trialNum}.log", stdOut + '\n' + stdErr);

            // Write the results csv to the results directory
            File.Copy(experiment.TrialResult, $"/experiment/results/{trialNum}.csv");
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

    enum FileType
    {
        Python,
        Java,
        C,
        Zip,
        Unknown
    }
}
