from dataclasses import dataclass
from typing import Union, Any, Callable
import logic_gates

"""
(λ)

Map function in continuation passing style (CPS)
Author: Khai Phung

Attribution: 
    - Dr. Mike Hewner (Buffalo) wrote the original map-cps code in racket

"We do what we must because we can" - Aperture Science

"""

# ======= Macro Definition =======
# Source: Chez Scheme define-datatype
def define_datatype(name, predicate, *variants):
    variant_classes = {}
    union_members = []

    for variant in variants:
        if isinstance(variant, str):
            variant_name = variant
            fields = []
        else:
            variant_name, *fields = variant

        annotations = {fname: Any for (fname, _) in fields}
        namespace = {'__annotations__': annotations}
        cls_name = variant_name.replace('-', '_').capitalize()

        cls = dataclass(type(cls_name, (object,), namespace), frozen=True)
        variant_classes[cls_name] = cls
        union_members.append(cls)

    union_name = name.capitalize()
    union_type = Union[tuple(union_members)]
    predicate_fn = lambda x: isinstance(x, union_type)

    return type(union_name, (), {**variant_classes, predicate: staticmethod(predicate_fn)})

# ======= Continuation datatype =======
"""
(require "chez-init.rkt")
(define-datatype continuation continuation?
  [init-k]
  [map1 (proc procedure?) (lst list?) (k continuation?)]
  [map2 (map1-v (λ (x) #t)) (k continuation?)]
  [map-two1 (proc procedure?) (ls1 list?) (ls2 list?) (k continuation?)]
  [map-two2 (map-two1-v (λ (x) #t)) (k continuation?)]
  )

"""

Continuation = define_datatype(
    "continuation", "continuation?",

    ["init-k"],

    # Map on one list
    ["map1", 
     ("proc", Callable), 
     ("lst", list), 
     ("k", "continuation?")],

    ["map2", 
     ("map1_v", Any), 
     ("k", "continuation?")],

    # Map on two lists
    ["map-two-1",
     ("proc", Callable), 
     ("ls1", list),
     ("ls2", list),
     ("k", "continuation?")],
    
    ["map-two-2", 
     ("map_two_1_v", Any), 
     ("k", "continuation?")]
)

def car(lst):
    return lst[0]    

def cdr(lst):
    return lst[1:]


"""
(define apply-k
  (lambda (k v)
    (cases continuation k
      [init-k () v]
      [map1 (proc lst k)
            (map-cps proc (cdr lst) (map2 v k))]
      [map2 (map1-v k)
            (apply-k k (cons map1-v v))]
      [map-two1 (proc ls1 ls2 k)
                (map-two-cps proc (cdr ls1) (cdr ls2) (map-two2 v k))]
      [map-two2 (map-two1-v k)
                (apply-k k (cons map-two1-v v))]
      )))
"""
def apply_k(k, v):
    match k:
        case Continuation.Init_k():
            return v

        case Continuation.Map1(proc, lst, k_next):
            return map_cps(proc, cdr(lst), Continuation.Map2(v, k_next))

        case Continuation.Map2(map1_v, k_next):
            return apply_k(k_next, [map1_v] + v)
        
        case Continuation.Map_two_1(proc, ls1, ls2, k_next):
            return map_cps_2(proc, cdr(ls1), cdr(ls2), Continuation.Map_two_2(v, k_next))

        case Continuation.Map_two_2(map_two_1_v, k_next):
            return apply_k(k_next, [map_two_1_v] + v)
        
        case _:
            raise TypeError(f"Unknown continuation: {k}")


"""
(define map-cps
  (λ (proc lst k)
    (if (null? lst)
        (apply-k k '())
        (proc (car lst) (map1 proc lst k)))))

(define map-two-cps
  (λ (proc ls1 ls2 k)
    (if (or (null? ls1) (null? ls2))
        (apply-k k '())
        (proc (car ls1) (car ls2) (map-two1 proc ls1 ls2 k)))))

"""
map_cps = lambda proc, lst, k: (
    apply_k(k, [])
    if not lst
    else proc(car(lst), Continuation.Map1(proc, lst, k))
)

map_cps_2 = lambda proc, ls1, ls2, k: (
    apply_k(k, [])
    if (ls1 == [] or ls2 == [])
    else proc(car(ls1), car(ls2),  Continuation.Map_two_1(proc, ls1, ls2, k))
)

and_cps = lambda num1, num2, k: ( # for testing setup
    apply_k(k, logic_gates.my_and(num1, num2))
)

# call/cc implementation using CPS
call_cc = lambda f, k: (
    f(
        lambda v, ignored_k: (
            apply_k(k, v)
        ),
        k
    )
)

# map but if it encounter the string "stop" it exits via call/cc
map_abort = lambda proc, lst, k: (
    call_cc(
        lambda exit, k1: (
            map_cps(
                lambda x, k2: (
                    exit("aborted", k2)
                    if (x == "stop")
                    else proc(x, k2)),
                lst,
                k1
            )
        ),
        k
    )
)


if __name__ == "__main__":
    add1_cps = lambda val, k: (
        apply_k(k, val + 1)
    )

    add = lambda x, y, k: (
        apply_k(k, x + y)
    )

    # (map-cps (λ (val k) (apply-k k (add1 val))) '(1 2 3) (init-k))
    result = map_cps(add1_cps, [1, 2, 3, 4, 5], Continuation.Init_k())
    print(result)  # → [2, 3, 4, 5, 6]

    
    # (map-two-cps (λ (v1 v2 k) (apply-k k (+ v1 v2))) '(1 2 3) '(1 1 1) (init-k))
    result = map_cps_2(add, [1, 2, 3], [4, 5, 6], Continuation.Init_k())
    print(result) # → [5, 7, 9]


    print(map_abort(lambda x, k: apply_k(k, x), [1, 2, 3, 4], Continuation.Init_k())) # → [1, 2, 3, 4]
    print(map_abort(lambda x, k: apply_k(k, x), [1, 2, "stop", 3, 4], Continuation.Init_k())) # → aborted
    # end main
    