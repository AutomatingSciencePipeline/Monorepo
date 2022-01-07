const main = require('../app.js');
//Tests paramJSON fucntion
test('This tests the paramJSON function with basic values', () => {
    expect(main.paramJSON("john", 10, 1, 20, 1)).toEqual({'paramName' : "john",
                                                'values' : [10, 1, 20, 1]});
});
test('This certifies previous test by making sure it is not auto passing', () => {
    expect(main.paramJSON("john", 10, 1, 20, 1)).not.toEqual({'paramName' : "Steve",
                                                'values' : [10, 1, 20, 1]});
});
test('Tests to see if the system limits min value', () => {
    expect(() => {main.paramJSON("john", 10, "bing bong", 20, 1)}).toThrow(TypeError);
});
test('Tests to see if the system limits max value', () => {
    expect(() => {main.paramJSON("john", 10, 1, "bing bong", 1)}).toThrow(TypeError);
});
test('Tests to see if the system limits increment value', () => {
    expect(() => {main.paramJSON("john", 10, 1, 20,"bing bong")}).toThrow(TypeError);
});
test('Tests to see if the system limits default value', () => {
    expect(() => {main.paramJSON("john", "bing bong", 1, 20, 1)}).toThrow(TypeError);
});

//Tests experimentParamsJSON function
test('This tests the experimentParamsJSON function with basic values', () => {
    expect(main.experimentParamsJSON([{'paramName' : "john",
    'values' : [10, 1, 20, 1]}], "TestExperiment","JohnD")).toEqual(
        {'experimentName': "TestExperiment",
        'user': "JohnD",
        'parameters': [{'paramName' : "john",
                                                'values' : [10, 1, 20, 1]}]});
});
test('This makes sure the previous test does not give a false positive', () => {
    expect(main.experimentParamsJSON([{'paramName' : "john",
    'values' : [10, 1, 20, 1]}], "TestExperiment","JohnB")).not.toEqual(
        {'experimentName': "TestExperiment",
        'user': "JohnD",
        'parameters': [{'paramName' : "john",
                                                'values' : [10, 1, 20, 1]}]});
});
test('This tests to see if an experiment with more than one parameter works', () => {
    expect(main.experimentParamsJSON([{'paramName' : "john",
    'values' : [10, 1, 20, 1]}, {'paramName' : "generation",
    'values' : [1, 10, .3, 1.2]}], "TestExperiment","JohnD")).toEqual(
        {'experimentName': "TestExperiment",
        'user': "JohnD",
        'parameters': [{'paramName' : "john",
                            'values' : [10, 1, 20, 1]}, 
                        {'paramName' : "generation",
                            'values' : [1, 10, .3, 1.2]}]});
});

//Tests checkUser and create user
test('This tests a basic use of the checkUser function', () => {
    expect(main.checkUser("johnD", "password")).toEqual(false);
});
test('This tests a basic use of the createUser function', () => {
    expect(main.createUser("johnD", "password")).toEqual(true);
})
test('This tests to see the already registered user', () => {
    expect(main.checkUser("johnD", "password")).toEqual(true);
});
test('This tests to create a new user with an already registered username', () => {
    expect(main.createUser("johnD", "password")).toEqual(false);
});
test('This tests to see if the function detects incorrect passwords', () => {
    expect(main.checkUser("johnD", "bassword")).toEqual(false);
});

