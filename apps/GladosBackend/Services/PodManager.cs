
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using k8s;
using k8s.Models;

public class PodManager
{
    private readonly V1Pod _pod;
    private readonly Experiment _experiment;
    private readonly byte[] _expFile;

    public PodManager(V1Pod pod, Experiment experiment, byte[] expFile)
    {
        // Pod will already be running, we will just be tasked with managing it
        _pod = pod;
        _experiment = experiment;
        _expFile = expFile;
        Manage();
    }

    private void Manage()
    {
        var config = KubernetesClientConfiguration.BuildDefaultConfig();
        var client = new Kubernetes(config);
        // Copy a json version of the experiment to the pod
        var experimentBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(_experiment));
        var experimentPath = "/experiment.json";
        // Copy the experiment to the pod
        CopyFileToPod(client, _pod.Metadata.Name, experimentBytes, experimentPath);
        // Copy the experiment file to the pod
        // Now we need to watch the job and update as experiments finish
        WatchPod(client, _experiment);
    }

    // Watch the pod and update the experiment status
    // as well as upload the results
    private void WatchPod(Kubernetes client, Experiment experiment)
    {
        var podName = "runner-" + experiment.Id;

        throw new NotImplementedException();
    }

    // Method to Copy a file to a pod
    private void CopyFileToPod(Kubernetes client, string podName, byte[] bytes, string destinationPath)
    {
        // Get the pod
        var pod = client.ReadNamespacedPod(podName, "default");
        // Write the bytes to a temp file
        var tempFile = Path.GetTempFileName();
        File.WriteAllBytes(tempFile, bytes);
        // Execute the copy command
        var copyCommand = new List<string>
            {
                "kubectl",
                "cp",
                tempFile,
                $"{pod.Metadata.Name}:{destinationPath}"
            };
        var copyCommandString = string.Join(" ", copyCommand);
        var copyCommandProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "kubectl",
                Arguments = copyCommandString,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };
        copyCommandProcess.Start();
        copyCommandProcess.WaitForExit();
        // Clean up the temp file
        File.Delete(tempFile);
    }
}

