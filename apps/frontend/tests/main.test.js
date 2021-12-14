const main = require('../scripts/main');
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