import itertools


def float_range(start, stop, step, decimals):
    """Helper for expanding values with floats, ensuring truncation."""
    current = start
    while round(current, decimals) < round(stop, decimals):  # Use rounded values for comparison
        yield round(current, decimals)  # Ensure consistent decimal places
        current += step


def get_decimal_places(number):
    """Returns the number of decimal places in a float."""
    if isinstance(number, int):
        return 0
    return max(0, len(str(number).split(".")[1]))


def expand_values(param):
    """Expands possible values for a parameter with appropriate decimal precision."""
    if param["type"] == "integer":
        return list(range(param["min"], param["max"] + 1, param["step"]))
    elif param["type"] == "float":
        decimals = max(
            get_decimal_places(param["min"]),
            get_decimal_places(param["max"]),
            get_decimal_places(param["step"]),
        )
        return list(float_range(param["min"], param["max"] + param["step"], param["step"], decimals))
    elif param["type"] == "stringlist":
        return param.get("values", [])
    elif param["type"] == "string":
        return [param["default"]]
    elif param["type"] == "bool":
        return [True, False]
    else:
        return []


def generate_permutations(parameters):
    """Generates permutations dynamically based on parameter definitions, 
       using itertools.product and filtering based on default values."""

    # Prepare all possible values for parameters, including default and expanded ranges
    all_values = []
    base_vals = {}
    default_vals = {}

    for param in parameters:
        if param["type"] == 'integer' or param["type"] == 'float':
            base_vals[param["name"]] = param["min"]
        elif param["type"] == 'stringlist':
            base_vals[param['name']] = param['values'][0]
        elif param["type"] == 'bool':
            base_vals[param["name"]] = param["default"]
        else:
            base_vals[param["name"]] = param["default"]

    for param in parameters:
        if param["default"] != -1:
            default_vals[param["name"]] = [param["default"]]
        else:
            default_vals[param["name"]] = expand_values(param)

    print(base_vals)
    print(default_vals)

    for param in parameters:
        all_values.append(expand_values(param))

    # Generate all permutations using itertools.product
    all_permutations = list(itertools.product(*all_values))

    # Now filter permutations based on the constraints: Default values should remain fixed.
    filtered_permutations = []
    for perm in all_permutations:
        perm_dict = {parameters[i]["name"]: perm[i]
                     for i in range(len(parameters))}

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

    return filtered_permutations


# Example input
parameters = [
    {"name": "x", "type": "integer", "default": -1, "min": 1, "max": 10, "step": 1},
    # {"name": "b", "type": "integer", "default": -1, "min": 11, "max": 20, "step": 1},
    # {"name": "c", "type": "integer", "default": 21, "min": 21, "max": 30, "step": 1},
    # {"name": "a", "type": "float", "default": -1, "min": 0.1, "max": 1.0, "step": 0.1},
    # {"name": "b", "type": "float", "default": -1, "min": 1.1, "max": 2.0, "step": 0.1},
    # {"name": "c", "type": "float", "default": 2.1, "min": 2.1, "max": 3.0, "step": 0.1},
    # {
    #   "name": "test",
    #   "default": False,
    #   "type": "bool"
    # },
    #  {
    #   "name": "test",
    #   "default": "testing",
    #   "type": "string"
    # },
    #  {
    #         "name": "seed",
    #         "type": "integer",
    #         "default": 1,
    #         "min": 1,
    #         "max": 10,
    #         "step": 1
    #     },
    {
        "name": "steps",
        "type": "stringlist",
        "default": "one",
        "values": ["one", "two"]
    },
    {
        "name": "steps2",
        "type": "stringlist",
        "default": -1,
        "values": ["a", "b", "c"]
    }
]

# Generate permutations
permutations = generate_permutations(parameters)

# # Print results
for p in permutations:
    print(p)

# Total permutations count
print("Total permutations:", len(permutations))
