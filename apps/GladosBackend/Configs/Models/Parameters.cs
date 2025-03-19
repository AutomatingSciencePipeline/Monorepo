using System.Text.Json;

namespace GladosBackend.Configs.Models;

public abstract class Parameter
{
    public string Name { get; set; }
    public string Type { get; set; }
    public bool UseDefault { get; set; }

    public object GetDefault(){
        // Try to get DefaultValue property
        var defaultValue = GetType().GetProperty("DefaultValue");
        if (defaultValue != null){
            return defaultValue.GetValue(this);
        }
        else {
            return GetType().GetProperty("Value").GetValue(this);
        }
    }
}

public class BoolParameter : Parameter
{
    public bool Value { get; set; }
    public BoolParameter(string json)
    {
        // Cast json to a dict
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        // Set the name
        Name = dict["name"].ToString();
        // Set the value
        Value = dict["value"].ToString() == "true";
        Type = "bool";
    }
}

public class StringListParameter : Parameter
{
    public List<string> Value { get; set; }
    public string? DefaultValue { get; set; }
    public StringListParameter(string json)
    {
        // Cast json to a dict
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        // Set the name
        Name = dict["name"].ToString();
        // Set the value
        Value = JsonSerializer.Deserialize<List<string>>(dict["value"].ToString());
        // Check if the default value is set
        if (dict["default"].ToString() != "-1")
        {
            DefaultValue = dict["default"].ToString();
            UseDefault = true;
        }
        else
        {
            UseDefault = false;
        }

        Type = "stringlist";
    }
}

public class ParamGroupParameter : Parameter
{
    public Dictionary<string, List<string>> Value { get; set; }
    public string? DefaultValue { get; set; }
    public ParamGroupParameter(string json)
    {
        // Cast json to a dict
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        // Set the name
        Name = dict["name"].ToString();
        // Set the value
        Value = [];

        // Cast the value to a dict
        var value = JsonSerializer.Deserialize<Dictionary<string, object>>(dict["value"].ToString());
        // Iterate over the keys
        foreach (var key in value.Keys)
        {
            // Add the key and value to the dictionary
            Value[key] = JsonSerializer.Deserialize<List<string>>(value[key].ToString());
        }

        // Get the default value
        if (dict["default"].ToString() != "-1")
        {
            DefaultValue = dict["default"].ToString();
            UseDefault = true;
        }
        else
        {
            UseDefault = false;
        }

        Type = "paramgroup";
    }
}

public class IntegerParameter : Parameter
{
    public int Min { get; set; }
    public int Max { get; set; }
    public int Step { get; set; }
    public int DefaultValue { get; set; }
    public IntegerParameter(string json)
    {
        // Cast json to a dict
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        // Set the name
        Name = dict["name"].ToString();
        // Set the min value
        Min = int.Parse(dict["min"].ToString());
        // Set the max value
        Max = int.Parse(dict["max"].ToString());
        // Set the step value
        Step = int.Parse(dict["step"].ToString());
        // Check if the default value is set
        if (dict["default"].ToString() != "-1")
        {
            DefaultValue = int.Parse(dict["default"].ToString());
            UseDefault = true;
        }
        else
        {
            UseDefault = false;
        }

        // Make sure that step is not 0
        if (Step == 0)
        {
            Step = 1;
        }

        // Make sure that the default value is within the min and max
        if (UseDefault)
        {
            if (DefaultValue < Min)
            {
                DefaultValue = Min;
            }
            else if (DefaultValue > Max)
            {
                DefaultValue = Max;
            }
        }

        // Make sure that the min is less than the max
        if (Min > Max)
        {
            Min = Max;
        }

        Type = "integer";
    }
}

public class FloatParameter : Parameter
{
    public decimal Min { get; set; }
    public decimal Max { get; set; }
    public decimal Step { get; set; }
    public decimal DefaultValue { get; set; }
    public FloatParameter(string json)
    {
        // Cast json to a dict
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        // Set the name
        Name = dict["name"].ToString();
        // Set the min value
        Min = decimal.Parse(dict["min"].ToString());
        // Set the max value
        Max = decimal.Parse(dict["max"].ToString());
        // Set the step value
        Step = decimal.Parse(dict["step"].ToString());
        // Check if the default value is set
        if (dict["default"].ToString() != "-1")
        {
            DefaultValue = decimal.Parse(dict["default"].ToString());
            UseDefault = true;
        }
        else
        {
            UseDefault = false;
        }

        if (Step == 0)
        {
            Step = 0.1m;
        }

        if (UseDefault)
        {
            if (DefaultValue < Min)
            {
                DefaultValue = Min;
            }
            else if (DefaultValue > Max)
            {
                DefaultValue = Max;
            }
        }

        if (Min > Max)
        {
            Min = Max;
        }

        // Make sure that the number of decimal places match between the min,max,step, and default value
        var minDecimals = Min.ToString().Split(".")[1].Length;
        var maxDecimals = Max.ToString().Split(".")[1].Length;
        var stepDecimals = Step.ToString().Split(".")[1].Length;
        int defaultDecimals = 0;
        if (UseDefault)
        {
            defaultDecimals = DefaultValue.ToString().Split(".")[1].Length;
        }


        int maxNumDecimals;
        if (UseDefault){
            maxNumDecimals = Math.Max(minDecimals, Math.Max(maxDecimals, Math.Max(stepDecimals, defaultDecimals)));
        }
        else {
            maxNumDecimals = Math.Max(minDecimals, Math.Max(maxDecimals, stepDecimals));
        }

        Min = Math.Round(Min, maxNumDecimals);
        Max = Math.Round(Max, maxNumDecimals);
        Step = Math.Round(Step, maxNumDecimals);
        DefaultValue = Math.Round(DefaultValue, maxNumDecimals);

        Type = "float";
    }
}