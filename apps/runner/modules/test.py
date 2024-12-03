import itertools

def generate_permutations(parameters):
    """
    Generate permutations based on parameters, considering default values.
    """
    all_permutations = []  # Store results
    
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
        
        # Step 2: Generate permutations for the current parameter
        for value in current_values:
            # Create base permutations using default values
            expanded_permutations = cartesian_product(fixed_values)
            for perm in expanded_permutations:
                perm[current_param['name']] = value
                all_permutations.append(perm)
    
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
        {
            "name": "seed",
            "type": "integer",
            "default": 1,
            "min": 1,
            "max": 10,
            "step": 1
        },
        {
            "name": "steps",
            "type": "stringlist",
            "default": -1,
            "values": ["one", "two"]
        },
        {
            "name": "steps2",
            "type": "stringlist",
            "default": "a",
            "values": ["a", "b", "c"]
        }
    ]
    
    # Generate permutations
    results = generate_permutations(parameters)
    
    # Output the results
    print("Generated Permutations:")
    for result in results:
        print(result)

if __name__ == "__main__":
    main()
