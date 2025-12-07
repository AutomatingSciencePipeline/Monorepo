
def isNumber(num):
    try:
        float(num)
        int(num)
        return True
    except:
        return False 

def is_valid_range(start, stop, step):
    if (isNumber(start)
        and isNumber(stop)
        and isNumber(step)
        and start >= -1e11 
        and stop <= 1e11 
        and (step == 0 or step >= 1e-11) 
        and start <= stop):

        return True

    return False   

def float_range(start, stop, step):
    if is_valid_range(start, stop, step):
        value = start

        if (step == 0):
            yield start
        else: 
            while value <= stop + 1e-13:  # tolerate floating point drift
                yield round(value, 13)
                value += step

    else:
        raise ValueError(f"Illegal range: ({start}, {stop}, {step})")

def preprocess_ranges(name, rng):
    if type(name) is str:
        if (type(rng) is tuple and len(rng) == 3):
            return (name, list(float_range(*rng)))
        elif (type(rng) is list):
            return (name, rng)
        else:
            raise ValueError(f"Input type not supported: {rng}")
    else:
        raise ValueError(f"Variable names must be string, but given: {name}") 