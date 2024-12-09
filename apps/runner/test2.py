from itertools import product


def generate_permutations(parameters):
    all_permutations = []
    default_vals = {}
    constants = {}
    vals_of_params_w_default = {}
    
    # get min vals
    for param in parameters:
      if param["type"] == 'integer':
        constants[param["name"]] = param["min"]
      elif param["type"] == 'stringlist':
          constants[param['name']] = param['values'][0]
        
       
    # get default vals
    for param in parameters:
        if param["default"] != -1:
            default_vals[param["name"]] = [param["default"]]
            vals_of_params_w_default = expand_values(param)
        else:
            default_vals[param["name"]] = expand_values(param)
    
    print("constant vals: ", constants)
    print("default vals: ", default_vals)
    
    for current_param_index, current_param in enumerate(parameters):
        fixed_values = {}  # Store fixed/default values for other parameters
        current_values = []  # Store possible values for the current parameter
        
        # Step 1: Determine values for other parameters
        for i, param in enumerate(parameters):
            if i == current_param_index:
                # Expand the current parameter
                if param['default'] == -1:
                    current_values = expand_values(param)
                else:
                    current_values = [param['default']]
            else:
                # Use default value for other parameters
                if param['default'] != -1:
                    fixed_values[param['name']] = [param['default']]
                else:
                    fixed_values[param['name']] = expand_values(param)
            
            if param["name"] == current_param["name"]:
                if param["default"] != -1:
                    for val in vals_of_params_w_default:
                        print("in default if case")
                        popped_dict = constants.copy()
                        popped_dict.pop(param["name"])
                        # print("popped dict", popped_dict)
                        print("default added", {param['name'] : val, **popped_dict})
                        all_permutations.append({param["name"]: val, **popped_dict})
                else:
                    for val in current_values:
                        popped_dict = constants.copy()
                        popped_dict.pop(param["name"])
                        # print("popped dict", popped_dict)
                        print("default added", {param['name'] : val, **popped_dict})
                        all_permutations.append({param["name"]: val, **popped_dict})
                        for key in default_vals.keys():
                            if key != current_param["name"]:
                                items = default_vals[key]
                                print("items: ", items)
                                for item in items:
                                    # print("current_param name: ", current_param)
                                    name_list = [current_param["name"]]
                                    for item2 in name_list:
                                        print("items2: ", item2)
                                        #check which keys are not in the created object
                                        if len(parameters) > 2:
                                            other_vals = getValsNotInObject({key: item, item2: val}, constants)
                                            print('other vals: ', other_vals)
                                            for constVal in other_vals:
                                                addedVal = constants[constVal]
                                                if not all_permutations.__contains__({key: item, item2: val, constVal: addedVal}):
                                                    print("perm added: ", {key: item, item2: val, constVal: addedVal})
                                                    all_permutations.append({key: item, item2: val, constVal: addedVal})
                                                # all_permutations.append({key: item, item2: val, constVal: addedVal})
                                        else:
                                             if not all_permutations.__contains__({key: item, item2: val}):
                                                print("perm added: ", {key: item, item2: val})
                                                all_permutations.append({key: item, item2: val})
                                                # all_permutations.append({key: item, item2: val, constVal: addedVal})
                                            
    # remove duplicates, regardless of order
    # Convert lists to tuples to make values hashable
    
    print("raw permutation count: ", len(all_permutations))
    processed_dicts = [
        {k: tuple(v) if isinstance(v, list) else v for k, v in d.items()} for d in all_permutations
    ]

    # Remove duplicates
    unique_dicts = [dict(t) for t in {tuple(sorted(d.items())) for d in processed_dicts}]
    
    return unique_dicts

def expand_values(param):
    """
    Expand the parameter into all possible values based on its type.
    """
    if param['type'] == 'integer':
        return list(range(param['min'], param['max'] + 1, param['step']))
    elif param['type'] == 'stringlist':
        return param['values']
    return []

def getValsNotInObject(object, constants):
    print(object)
    results = []
    
    for key in constants.keys():
        if not key in object.keys():
            results.append(key)
        
    print("results", results)
    return results

def generate_permutations_test(parameters):
    # Store possible values for each parameter
    all_values = {}
    
    for param in parameters:
        if param["default"] != -1:
            all_values[param["name"]] = [param["default"]]  # Include default as a single value
        else:
            all_values[param["name"]] = expand_values(param)
    
    print("Expanded values for parameters:", all_values)
    
    # Generate all combinations of parameter values
    keys = list(all_values.keys())
    value_combinations = list(product(*all_values.values()))
    
    all_permutations = [dict(zip(keys, values)) for values in value_combinations]
    
    return all_permutations
    

def main():
    # Input parameters
    parameters = [
        # {
        #     "name": "seed",
        #     "type": "integer",
        #     "default": -1,
        #     "min": 1,
        #     "max": 10,
        #     "step": 1
        # },
        # {
        #     "name": "steps",
        #     "type": "stringlist",
        #     "default": -1,
        #     "values": ["one", "two"]
        # },
        # {
        #     "name": "steps2",
        #     "type": "stringlist",
        #     "default": -1,
        #     "values": ["a", "b"]
        # }
         {
            "name": "a",
            "type": "integer",
            "default": -1,
            "min": 1,
            "max": 10,
            "step": 1
        },
          {
            "name": "b",
            "type": "integer",
            "default": -1,
            "min": 11,
            "max": 20,
            "step": 1
        },
          {
            "name": "c",
            "type": "integer",
            "default": 21,
            "min": 21,
            "max": 30,
            "step": 1
        },
        #    {
        #     "name": "d",
        #     "type": "integer",
        #     "default": -1,
        #     "min": 31,
        #     "max": 40,
        #     "step": 1
        # },
        #     {
        #     "name": "e",
        #     "type": "integer",
        #     "default": -1,
        #     "min": 41,
        #     "max": 50,
        #     "step": 1
        # },
          
    ]
    
    results = generate_permutations(parameters)
    
    # result_test = generate_permutations_test(parameters)
    
    # # Output the results
    print("Generated Permutations:")
    print(len(results))
#     rearranged_data = [
#     {k: d[k] for k in ['a', 'b', 'c']}
#     for d in sorted(results, key=lambda x: x['a'])
# ]
#     for result in rearranged_data:
#         print(result)
    
    for result in results:
        print(result)
        
    # print("test permutations")
    # print(len(result_test))
    # for result2 in result_test:
    #     print(result2)

if __name__ == "__main__":
    main()