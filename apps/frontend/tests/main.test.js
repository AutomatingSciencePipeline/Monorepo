const main = require('../app.js');
//Tests paramJSONMultVals integer fucntion
test('This tests the paramJSON function with basic integer values', () => {
    expect(main.paramJSONMultVals("john", 10, 1, 20, 1, "integer")).toEqual({'paramName' : "john",
                                                'values' : [10, 1, 20, 1],
                                                'type' : "integer"});
});
test('This certifies previous test by making sure it is not auto passing', () => {
    expect(main.paramJSONMultVals("john", 10, 1, 20, 1, "integer")).not.toEqual({'paramName' : "Steve",
                                                'values' : [10, 1, 20, 1],
                                                'type' : "integer"});
});
test('Tests to see if the system limits integer min value', () => {
    expect(() => {main.paramJSONMultVals("john", 10, "bing bong", 20, 1, "integer")}).toThrow(TypeError);
});
test('Tests to see if the system limits integer max value', () => {
    expect(() => {main.paramJSONMultVals("john", 10, 1, "bing bong", 1, "integer")}).toThrow(TypeError);
});
test('Tests to see if the system limits integer increment value', () => {
    expect(() => {main.paramJSONMultVals("john", 10, 1, 20,"bing bong", "integer")}).toThrow(TypeError);
});
test('Tests to see if the system limits integer default value', () => {
    expect(() => {main.paramJSONMultVals("john", "bing bong", 1, 20, 1, "integer")}).toThrow(TypeError);
});

//Tests paramJSONMultVals float fucntion
test('This tests the paramJSON function with basic float values', () => {
    expect(main.paramJSONMultVals("john", 10.1, 1.1, 20.1, 1.1, "float")).toEqual({'paramName' : "john",
                                                'values' : [10.1, 1.1, 20.1, 1.1],
                                                'type' : "float"});
});
test('This certifies previous test by making sure it is not auto passing', () => {
    expect(main.paramJSONMultVals("john", 10.1, 1.1, 20.1, 1.1, "float")).not.toEqual({'paramName' : "Steve",
                                                'values' : [10.1, 1.1, 20.1, 1.1],
                                                'type' : "float"});
});
test('Tests to see if the system limits float min value', () => {
    expect(() => {main.paramJSONMultVals("john", 10.1, "bing bong", 20.1, 1.1, "float")}).toThrow(TypeError);
});
test('Tests to see if the system limits float max value', () => {
    expect(() => {main.paramJSONMultVals("john", 10.1, 1.1, "bing bong", 1.1, "float")}).toThrow(TypeError);
});
test('Tests to see if the system limits float increment value', () => {
    expect(() => {main.paramJSONMultVals("john", 10.1, 1.1, 20.1,"bing bong", "float")}).toThrow(TypeError);
});
test('Tests to see if the system limits float default value', () => {
    expect(() => {main.paramJSONMultVals("john", "bing bong", 1.1, 20.1, 1.1, "float")}).toThrow(TypeError);
});

//Tests paramJSONSingleVal function for Array
test('Tests to see if the function can handle array parameters', () => {
    expect(main.paramJSONSingleVal("john", "[1, 2, 3, 4]", "array")).toEqual({
        'paramName' : "john",
        'value' : [1, 2, 3, 4],
        'type' : "array"
    });
})
test('Tests to see if the first test is not giving false positives', () => {
    expect(main.paramJSONSingleVal("john", "[1, 2, 3, 4]", "array")).not.toEqual({
        'paramName' : "bunger",
        'value' : [1, 2, 3, 4],
        'type' : "array"
    });
})

//Tests paramJSONSingleVal function for Boolean
test('Tests to see if the function can handle boolean parameter true', () => {
    expect(main.paramJSONSingleVal("john", "true", "boolean")).toEqual({
        'paramName' : "john",
        'value' : true,
        'type' : "boolean"
    });
})
test('Tests to see if the function can handle boolean parameter false', () => {
    expect(main.paramJSONSingleVal("john", "false", "boolean")).toEqual({
        'paramName' : "john",
        'value' : false,
        'type' : "boolean"
    });
})

test('Tests to see if the first function is not giving false positves', () => {
    expect(main.paramJSONSingleVal("john", "true", "boolean")).not.toEqual({
        'paramName' : "steve",
        'value' : true,
        'type' : "boolean"
    });
})

test('Tests to see if the second function is not giving false positives', () => {
    expect(main.paramJSONSingleVal("john", "false", "boolean")).not.toEqual({
        'paramName' : "steve",
        'value' : true,
        'type' : "boolean"
    });
})

//Tests paramJSONSingleVal file type
test('Tests to see if the function can handle file parameter (string)', () => {
    expect(main.paramJSONSingleVal("john", "C://temp/usr/bin/test.java", "file")).toEqual({
        'paramName' : "john",
        'value' : "C://temp/usr/bin/test.java",
        'type' : "file"
    });
})

test('Tests to see if the first function is not sending false positives', () => {
    expect(main.paramJSONSingleVal("john", "C://temp/usr/bin/test.java", "file")).not.toEqual({
        'paramName' : "steve",
        'value' : "C://temp/usr/bin/test.java",
        'type' : "file"
    });
})





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
// test('This tests a basic use of the checkUser function', () => {
//     expect(main.checkUser("johnD", "password")).toEqual(false);
// });
// test('This tests a basic use of the createUser function', () => {
//     expect(main.createUser("johnD", "password")).toEqual(true);
// })
// test('This tests to see the already registered user', () => {
//     expect(main.checkUser("johnD", "password")).toEqual(true);
// });
// test('This tests to create a new user with an already registered username', () => {
//     expect(main.createUser("johnD", "password")).toEqual(false);
// });
// test('This tests to see if the function detects incorrect passwords', () => {
//     expect(main.checkUser("johnD", "bassword")).toEqual(false);
// });

