#!/opt/homebrew/bin/python3

import random
import copy
import sys

#sample experiment that runs a truncation generational loop with a genome represented by a list of 0s and 1s. fitness is measured by number of 1s
#in genome. maximum fitness is measured at the given generation number.
#number of population, genome length, and mutation rate are given. a number can be given for seed or an r can be given for a random seed
    

class Chromosome:
    genome = []
    fitness = 0

    #determine fitness of chromosome
    def chromFitness(self):
        self.fitness = 0
        for bit in self.genome:
            if bit == 1:
                self.fitness += 1

    #mutate chromosome given a rate of mutation
    def mutate(self, mutrate):
        k = 0
        for bit in self.genome:
            if random.random() < mutrate:
                if bit == 1:
                    self.genome[k] = 0
                else:
                    self.genome[k] = 1
            k += 1

#randomly generate initial population of chromosomes
def generateChroms(population, genomelength):
    chroms = []
    for k in range(population):
        chrom = Chromosome()
        chrom.genome = []
        for i in range(genomelength):
            bit = random.randrange(2)
            chrom.genome.append(bit)
        chroms.append(chrom)
    return chroms

#convert genome from list of ints to string
def genToString(gen):
    strGen = ""
    for bit in gen:
        strGen += str(bit)
    return strGen

#determine fitness of all chromosomes in a population
def evaluateFitness(chroms):
    for chrom in chroms:
        chrom.chromFitness()

#determine chromosome fitness for sorting
def chromSort(chrom):
    return chrom.fitness

#main generational loop: for each loop, removes least fit half of chromosomes from population. The remaining chromosomes are duplicated to 
#replace the population. every generation, every bit in the genome of every chromosome has a chance to mutate and flip from a 1 to a 0
def main():
    args = sys.argv[1:]
    #takes in 5 arguments: generations, population, genome length, mutation rate, and seed
    generations = int(float(args[0]))
    population = int(float(args[1]))
    genomelength = int(float(args[2]))
    mutationrate = float(args[3])
    seed = int(float(args[4]))
    random.seed(seed)
    #generate initial population
    chroms = generateChroms(population, genomelength)
    for k in range(generations):
        #sort chromosomes, with highest fitness being at front of list
        evaluateFitness(chroms)
        chroms.sort(key=chromSort, reverse=True)
        #remove least fit half from population
        chroms = chroms[:len(chroms) - int(population / 2)]
        newchroms = []
        for chrom in chroms:
            #copy to replace removed half
            chrom0 = copy.deepcopy(chrom)
            #mutate all chromosomes
            chrom.mutate(mutationrate)
            chrom0.mutate(mutationrate)
            #add new chromosomes to list
            newchroms.append(chrom)
            newchroms.append(chrom0)
        #newly copied and mutated chromosomes become current generation   
        chroms = newchroms
    print(float(chroms[0].fitness))
    return 0

        
if __name__ == "__main__":
    main()
