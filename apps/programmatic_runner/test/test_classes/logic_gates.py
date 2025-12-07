"""
Basic logic gates of digital systems
"""
def my_and(a, b):
    return a and b

def my_or(a, b):
    return a or b

def my_not(a):
    return 1 - a

def my_xor(a, b):
    return a ^ b

def my_nand(a, b):
    return my_not(my_and(a, b))

def my_nor(a, b):
    return my_not(my_or(a, b))

def my_xnor(a, b):
    return my_not(my_xor(a, b))

