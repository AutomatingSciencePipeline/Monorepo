import itertools

def expand_values(param):
    """Expands possible values for a parameter."""
    if param["type"] == "integer":
        return list(range(param["min"], param["max"] + 1, param["step"]))
    elif param["type"] == "stringlist":
        return param.get("values", [])
    elif param["type"] == 'bool':
        return param.get("default")
    else:
        return []

def generate_permutations(parameters):
    """Generates permutations dynamically based on parameter definitions, 
       using itertools.product and filtering based on default values."""
    
    # Prepare all possible values for parameters, including default and expanded ranges
    all_values = []
    base_vals = {}
    default_vals = {}
    num_non_default_vals = 0
    
    
    for param in parameters:
      if param["type"] == 'integer':
        base_vals[param["name"]] = param["min"]
      elif param["type"] == 'stringlist':
        base_vals[param['name']] = param['values'][0]

          
    for param in parameters:
        if param["default"] != -1:
            default_vals[param["name"]] = [param["default"]]
        else:
            default_vals[param["name"]] = expand_values(param)
            num_non_default_vals = num_non_default_vals + 1
          
    print(base_vals)
    for param in parameters:
        all_values.append(expand_values(param))
        
    print(num_non_default_vals)
    
    # Generate all permutations using itertools.product
    all_permutations = list(itertools.product(*all_values))
    
    # if num_non_default_vals + 1 == len(parameters):
    #     return all_permutations
    

    # Now filter permutations based on the constraints: Default values should remain fixed.
    filtered_permutations = []
    for perm in all_permutations:
        perm_dict = {parameters[i]["name"]: perm[i] for i in range(len(parameters))}
        
        num_defaults_changed = 0
        for param in parameters:
            if param["default"] != -1:
                if perm_dict[param["name"]] != param["default"]:
                    num_defaults_changed += 1
        # else:
        #     # If all constraints are satisfied, add the permutation
        #     filtered_permutations.append(perm_dict)
        
        if num_defaults_changed <= 1:
            filtered_permutations.append(perm_dict)

    print("len filtered: ", len(filtered_permutations))
    
    # print(base_vals)
    # base_vals_popped = base_vals.copy()
    # base_vals_popped.pop(param["name"])
    # print(base_vals_popped)
    
    # for param in parameters:
    #     if param['default'] != -1:
    #         if param["type"] == 'integer':
    #         #then add the iteration of each var that has a default value
    #             for value in range(param["min"], param["max"] + 1, param["step"]):
    #                 filtered_permutations.append({**base_vals_popped, param["name"]: value})
    #         elif param["type"] == 'stringlist':
    #             for value in param["values"]:
    #                 # print('adding in elif: ', {**base_vals_popped, param['name']: value})
    #                 filtered_permutations.append({**base_vals_popped, param["name"]: value})
            
    return filtered_permutations


# Example input
parameters = [
    {"name": "a", "type": "integer", "default": -1, "min": 1, "max": 10, "step": 1},
    {"name": "b", "type": "integer", "default": 11, "min": 11, "max": 20, "step": 1},
    {"name": "c", "type": "integer", "default": 21, "min": 21, "max": 30, "step": 1},
    # {
    #   "name": "test",
    #   "default": "false",
    #   "type": "bool"
    # },
    #  {
    #         "name": "seed",
    #         "type": "integer",
    #         "default": -1,
    #         "min": 1,
    #         "max": 10,
    #         "step": 1
    #     },
    #     {
    #         "name": "steps",
    #         "type": "stringlist",
    #         "default": -1,
    #         "values": ["one", "two"]
    #     },
    #     {
    #         "name": "steps2",
    #         "type": "stringlist",
    #         "default": -1,
    #         "values": ["a", "b"]
    #     }
]

# Generate permutations
permutations = generate_permutations(parameters)

# # Print results
for p in permutations:
    print(p)

# Total permutations count
print("Total permutations:", len(permutations))
 