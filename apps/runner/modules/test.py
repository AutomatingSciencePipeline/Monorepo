import itertools

def generate_permutations(parameters):
    """
    Generate permutations based on parameters, considering default values.
    """
    all_permutations = []  # Store results
    default_vals = {}
    
    #get min values for each parameter
    
    
    for current_param_index, current_param in enumerate(parameters):
        fixed_values = {}  # Store fixed/default values for other parameters
        current_values = []  # Store possible values for the current parameter
        
        # Step 1: Determine values for other parameters
        for i, param in enumerate(parameters):
            if i == current_param_index:
                # Expand the current parameter
                if param['default'] == -1:
                    current_values = expand_values(param)
                    default_vals[param["name"]] = current_values
                else:
                    current_values = [param['default']]
            else:
                # Use default value for other parameters
                if param['default'] != -1:
                    fixed_values[param['name']] = [param['default']]
                else:
                    fixed_values[param['name']] = expand_values(param)
            
            # for val in current_values:
            #     all_permutations.append(val, )
                
            
        
        print("fixed vals after step 1: ", fixed_values)
        print("current vals after step 1: ", current_values)
        
        # Step 2: Generate permutations for the current parameter
        for value in current_values:
            # Create base permutations using default values
            expanded_permutations = cartesian_product(fixed_values)
            for perm in expanded_permutations:
                perm[current_param['name']] = value
                all_permutations.append(perm)
                
    # Remove duplicates
    all_permutations = [dict(t) for t in {frozenset(d.items()) for d in all_permutations}]
    
    
    # print("all permutations: ", all_permutations)
    # print("len all permutations: ", len(all_permutations))
    return all_permutations

def expand_values(param):
    """
    Expand the parameter into all possible values based on its type.
    """
    if param['type'] == 'integer':
        return list(range(param['min'], param['max'] + 1, param['step']))
    elif param['type'] == 'stringlist':
        return param['values']
    return []

def cartesian_product(params_dict):
    """
    Generate Cartesian product of all parameter values.
    """
    if not params_dict:  # Handle empty dictionaries
        return [{}]
    keys, values = zip(*params_dict.items())
    return [dict(zip(keys, v)) for v in itertools.product(*values)]

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
          
    ]
    
    # Generate permutations
    results = generate_permutations(parameters)
    
    # # Output the results
    print("Generated Permutations:")
    print(len(results))
    for result in results:
        print(result)

if __name__ == "__main__":
    main()
