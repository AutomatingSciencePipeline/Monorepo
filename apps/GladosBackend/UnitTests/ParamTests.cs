using System;
using Xunit;

using GladosBackend.Configs.Models;
using GladosBackend.Configs;

namespace GladosBackend.UnitTests.ParamTests;

public class ParamTests{
    [Fact]
    public void TestBoolParam(){
        var json = "{\"name\": \"test\", \"type\": \"bool\", \"value\": \"true\"}";
        var param = new BoolParameter(json);
        Assert.Equal("test", param.Name);
        Assert.True(param.Value);

        var parsedParam = ConfigParser.ParseParameter(json);
        Assert.Equal("test", parsedParam.Name);
        // Make sure the type is correct
        Assert.IsType<BoolParameter>(parsedParam);
        // Make sure the value is correct
        Assert.True((parsedParam as BoolParameter).Value);
    }

    [Fact]
    public void TestStringListParam(){
        var json = "{\"name\": \"test\", \"type\": \"stringlist\", \"value\": [\"test1\", \"test2\"], \"default\": \"-1\"}";
        var param = new StringListParameter(json);
        Assert.Equal("test", param.Name);
        Assert.Equal(new List<string>{"test1", "test2"}, param.Value);

        var parsedParam = ConfigParser.ParseParameter(json);
        Assert.Equal("test", parsedParam.Name);
        // Make sure the type is correct
        Assert.IsType<StringListParameter>(parsedParam);
        // Make sure the value is correct
        Assert.Equal(new List<string>{"test1", "test2"}, (parsedParam as StringListParameter).Value);
    }

    [Fact]
    public void TestParamGroupParam(){
        var json = "{\"name\": \"test\", \"type\": \"paramgroup\", \"value\": {\"test1\": [\"test2\", \"test3\"]},  \"default\": \"-1\"}";
        var param = new ParamGroupParameter(json);
        Assert.Equal("test", param.Name);
        Assert.Equal(new Dictionary<string, List<string>>{{"test1", new List<string>{"test2", "test3"}}}, param.Value);
    
        var parsedParam = ConfigParser.ParseParameter(json);
        Assert.Equal("test", parsedParam.Name);
        // Make sure the type is correct
        Assert.IsType<ParamGroupParameter>(parsedParam);
        // Make sure the value is correct
        Assert.Equal(new Dictionary<string, List<string>>{{"test1", new List<string>{"test2", "test3"}}}, (parsedParam as ParamGroupParameter).Value);
    }

    [Fact]
    public void TestIntegerParam(){
        var json = "{\"name\": \"test\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}";
        var param = new IntegerParameter(json);
        Assert.Equal("test", param.Name);
        Assert.Equal(1, param.Min);
        Assert.Equal(10, param.Max);
        Assert.Equal(1, param.Step);
        Assert.False(param.UseDefault);

        var parsedParam = ConfigParser.ParseParameter(json);
        Assert.Equal("test", parsedParam.Name);
        // Make sure the type is correct
        Assert.IsType<IntegerParameter>(parsedParam);
        // Make sure the value is correct
        Assert.Equal(1, (parsedParam as IntegerParameter).Min);
        Assert.Equal(10, (parsedParam as IntegerParameter).Max);
        Assert.Equal(1, (parsedParam as IntegerParameter).Step);
        Assert.False((parsedParam as IntegerParameter).UseDefault);
    }

    [Fact]
    public void TestFloatParam(){
        var json = "{\"name\": \"test\", \"type\": \"float\", \"min\": \"1.0\", \"max\": \"10.0\", \"step\": \"1.5\", \"default\": -1}";
        var param = new FloatParameter(json);
        Assert.Equal("test", param.Name);
        Assert.Equal(1.0m, param.Min);
        Assert.Equal(10.0m, param.Max);
        Assert.Equal(1.5m, param.Step);
        Assert.False(param.UseDefault);

        var parsedParam = ConfigParser.ParseParameter(json);
        Assert.Equal("test", parsedParam.Name);
        // Make sure the type is correct
        Assert.IsType<FloatParameter>(parsedParam);
        // Make sure the value is correct
        Assert.Equal(1.0m, (parsedParam as FloatParameter).Min);
        Assert.Equal(10.0m, (parsedParam as FloatParameter).Max);
        Assert.Equal(1.5m, (parsedParam as FloatParameter).Step);
        Assert.False((parsedParam as FloatParameter).UseDefault);
    }

    [Fact]
    public void TestGeneratePerms1(){
        // Create a list of two integer parameters
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}"),
            new IntegerParameter("{\"name\": \"test2\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}")
        };

        // This should generate 100 permutations
        var perms = ConfigParser.GeneratePermutations(parameters);
        Assert.Equal(100, perms.Count);
    }

    [Fact]
    public void TestGeneratePerms2(){
        // Create a list of one integer parameter and one float parameter
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}"),
            new FloatParameter("{\"name\": \"test2\", \"type\": \"float\", \"min\": \"1.0\", \"max\": \"1.9\", \"step\": \"0.1\", \"default\": -1}")
        };

        // This should generate 100 permutations
        var perms = ConfigParser.GeneratePermutations(parameters);
        Assert.Equal(100, perms.Count);
    }

    [Fact]
    public void TestGeneratePerms3(){
        // Create a list of one integer parameter and one string list parameter
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}"),
            new StringListParameter("{\"name\": \"test2\", \"type\": \"stringlist\", \"value\": [\"test1\", \"test2\"], \"default\": \"-1\"}")
        };

        // This should generate 20 permutations
        var perms = ConfigParser.GeneratePermutations(parameters);
        Assert.Equal(20, perms.Count);
    }

    [Fact]
    public void TestGeneratePerms4(){
        // Create a list of one integer parameter and one bool parameter
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}"),
            new BoolParameter("{\"name\": \"test2\", \"type\": \"bool\", \"value\": \"true\"}")
        };

        // This should generate 20 permutations
        var perms = ConfigParser.GeneratePermutations(parameters);
        Assert.Equal(10, perms.Count);
    }

    [Fact]
    public void TestGeneratePerms5(){
        // Create a list of one integer paramater and one paramgroup parameter
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": -1}"),
            new ParamGroupParameter("{\"name\": \"test2\", \"type\": \"paramgroup\", \"value\": {\"test2\": [\"test2\", \"test3\"], \"test3\": [\"val1\", \"val2\"]},  \"default\": \"-1\"}")
        };

        // This should generate 20 permutations
        var perms = ConfigParser.GeneratePermutations(parameters);
        Assert.Equal(20, perms.Count);
    }

    [Fact]
    public void TestGeneratePermsDefaults1(){
        // Create a list of two integer parameters
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": 5}"),
            new IntegerParameter("{\"name\": \"test2\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": 5}"),
            new IntegerParameter("{\"name\": \"test3\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"10\", \"step\": \"1\", \"default\": 5}")
        };

        // This should generate 28 permutation
        var perms = ConfigParser.GeneratePermutations(parameters);
        Assert.Equal(28, perms.Count);
    }

    [Fact]
    public void TestFormatPermutation1(){
        // Create a list of two integer parameters
        var parameters = new List<Parameter>{
            new IntegerParameter("{\"name\": \"test1\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"1\", \"step\": \"1\", \"default\": -1}"),
            new IntegerParameter("{\"name\": \"test2\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"1\", \"step\": \"1\", \"default\": -1}"),
            new IntegerParameter("{\"name\": \"test3\", \"type\": \"integer\", \"min\": \"1\", \"max\": \"1\", \"step\": \"1\", \"default\": -1}")
        };

        // Generate the permutations
        var perms = ConfigParser.GeneratePermutations(parameters);

        // Format the first permutation
        var formatted = ConfigParser.FormatPermutation(perms[0], string.Empty);
        Assert.Equal("[DEFAULT]\ntest1: 1\ntest2: 1\ntest3: 1", formatted);
    }
}