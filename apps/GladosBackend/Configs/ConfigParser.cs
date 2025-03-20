using System.Text;
using System.Text.Json;
using GladosBackend.Configs.Models;

namespace GladosBackend.Configs;

public class ConfigParser
{
    // Parses a JSON string into a Parameter object based on its type
    public static Parameter ParseParameter(string json)
    {
        // Deserialize JSON string to a dictionary
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        if (dict == null)
        {
            throw new Exception("Invalid JSON");
        }
        // Determine the type of parameter and return the corresponding object
        if (dict["type"].ToString() == "bool")
        {
            return new BoolParameter(json);
        }
        else if (dict["type"].ToString() == "stringlist")
        {
            return new StringListParameter(json);
        }
        else if (dict["type"].ToString() == "paramgroup")
        {
            return new ParamGroupParameter(json);
        }
        else if (dict["type"].ToString() == "integer")
        {
            return new IntegerParameter(json);
        }
        else if (dict["type"].ToString() == "float")
        {
            return new FloatParameter(json);
        }

        throw new Exception("Invalid parameter type");
    }

    // Generates all possible permutations of the given parameters
    public static List<Dictionary<string, object>> GeneratePermutations(List<Parameter> parameters)
    {
        // Separate out the paramgroup parameters
        var paramGroups = parameters.Where(p => p is ParamGroupParameter).ToList();
        parameters = parameters.Where(p => !(p is ParamGroupParameter)).ToList();

        // Prepare all possible values for parameters, including default and expanded ranges
        var allValues = new List<List<object>>();
        var baseValues = new Dictionary<string, object>();
        var defaultValues = new Dictionary<string, object>();

        // Initialize base values for each parameter
        foreach (var parameter in parameters)
        {
            if (parameter is IntegerParameter intParam)
            {
                baseValues[parameter.Name] = intParam.Min;
            }
            else if (parameter is FloatParameter floatParam)
            {
                baseValues[parameter.Name] = floatParam.Min;
            }
            else if (parameter is StringListParameter stringListParameter)
            {
                baseValues[parameter.Name] = stringListParameter.Value[0];
            }
            else if (parameter is BoolParameter boolParameter)
            {
                baseValues[parameter.Name] = boolParameter.Value;
            }
        }

        // Initialize default values for each parameter
        foreach (var parameter in parameters)
        {
            if (parameter.UseDefault)
            {
                if (parameter is BoolParameter boolParameter)
                {
                    defaultValues[parameter.Name] = boolParameter.Value;
                }
                else {
                    defaultValues[parameter.Name] = parameter.GetDefault();
                }
            }
            else
            {
                defaultValues[parameter.Name] = ExpandParameter(parameter);
            }
        }

        // Expand each parameter to its possible values
        foreach (var parameter in parameters)
        {
            if (parameter is ParamGroupParameter)
            {
                continue;
            }
            allValues.Add(ExpandParameter(parameter));
        }

        // Generate all possible permutations of the parameter values
        var allPermutations = CartesianProduct(allValues);

        // Filter permutations based on the constraints: Default values should remain fixed.
        var filteredPermutations = new List<Dictionary<string, object>>();

        foreach (var permutation in allPermutations)
        {
            var permDict = parameters
            .Select((param, i) => new { Key = param.Name, Value = permutation.ToList()[i] })
            .ToDictionary(x => x.Key, x => x.Value);

            // Count the number of default values that have changed
            var numDefaultsChanged = 0;
            foreach (var parameter in parameters)
            {
                if (parameter.UseDefault)
                {
                    if (parameter is BoolParameter boolParameter)
                    {
                        if (boolParameter.Value != (bool)permDict[parameter.Name])
                        {
                            numDefaultsChanged++;
                        }
                    }
                    else if (parameter is StringListParameter stringListParameter)
                    {
                        if (stringListParameter.DefaultValue != (string)permDict[parameter.Name])
                        {
                            numDefaultsChanged++;
                        }
                    }
                    else if (parameter is IntegerParameter integerParameter)
                    {
                        if (integerParameter.DefaultValue != (int)permDict[parameter.Name])
                        {
                            numDefaultsChanged++;
                        }
                    }
                    else if (parameter is FloatParameter floatParameter)
                    {
                        if (floatParameter.DefaultValue != (decimal)permDict[parameter.Name])
                        {
                            numDefaultsChanged++;
                        }
                    }
                }
            }

            // Add permutation to the filtered list if the number of changed defaults is within the allowed limit
            if (numDefaultsChanged <= 1)
            {
                filteredPermutations.Add(permDict);
            }
        }

        // Handle paramgroup if provided
        if (paramGroups.Count > 0)
        {
            var paramGroupPermutations = new List<Dictionary<string, object>>();
            foreach (var paramGroup in paramGroups)
            {
                var paramNames = (paramGroup as ParamGroupParameter).Value.Keys.ToList();
                var paramValues = (paramGroup as ParamGroupParameter).Value.Values.ToList();

                // Generate specific combinations of paramgroup values
                for (var i = 0; i < paramValues[0].Count; i++)
                {
                    var paramGroupDict = new Dictionary<string, object>();
                    for (var j = 0; j < paramNames.Count; j++)
                    {
                        paramGroupDict[paramNames[j]] = paramValues[j][i];
                    }
                    paramGroupPermutations.Add(paramGroupDict);
                }
            }

            var combinedPermutations = filteredPermutations
                .SelectMany(perm => paramGroupPermutations
                    .Select(paramGroupPerm => perm.Concat(paramGroupPerm)
                        .ToDictionary(kvp => kvp.Key, kvp => kvp.Value)))
                .ToList();

            filteredPermutations = combinedPermutations;
        }

        return filteredPermutations;
    }

    public static string FormatPermutation(Dictionary<string, object> permutation, string userDefinedConstants)
    {
        var formattedPermutation = new StringBuilder();
        formattedPermutation.AppendLine("[DEFAULT]");
        foreach (var kvp in permutation)
        {
            formattedPermutation.AppendLine($"{kvp.Key}: {kvp.Value}");
        }

        if (!string.IsNullOrEmpty(userDefinedConstants))
        {
            formattedPermutation.AppendLine(userDefinedConstants);
        }

        return formattedPermutation.ToString().TrimEnd();
    }

    // Expands a parameter to its possible values
    private static List<object> ExpandParameter(Parameter parameter)
    {
        if (parameter is BoolParameter boolParam)
        {
            return [boolParam.Value];
        }
        else if (parameter is StringListParameter stringListParam)
        {
            return stringListParam.Value.Cast<object>().ToList();
        }
        else if (parameter is ParamGroupParameter paramGroupParam)
        {
            return [paramGroupParam.Value];
        }
        else if (parameter is IntegerParameter intParam)
        {
            // Generate a list of integers from min to max with the given step
            var min = intParam.Min;
            var max = intParam.Max;
            var step = intParam.Step;
            var values = new List<object>();
            for (int i = min; i <= max; i += step)
            {
                values.Add(i);
            }
            return values;
        }
        else if (parameter is FloatParameter floatParam)
        {
            // Generate a list of floats from min to max with the given step
            var min = floatParam.Min;
            var max = floatParam.Max;
            var step = floatParam.Step;
            var values = new List<object>();
            for (decimal i = min; i <= max; i += step)
            {
                values.Add(i);
            }
            return values;
        }

        throw new Exception("Invalid parameter type");
    }

    // Generates the Cartesian product of a sequence of sequences
    private static IEnumerable<IEnumerable<T>> CartesianProduct<T>(IEnumerable<IEnumerable<T>> sequences)
    {
        IEnumerable<IEnumerable<T>> emptyProduct = new[] { Enumerable.Empty<T>() };
        return sequences.Aggregate(
            emptyProduct,
            (accumulator, sequence) =>
                from accseq in accumulator
                from item in sequence
                select accseq.Concat(new[] { item }));
    }
}