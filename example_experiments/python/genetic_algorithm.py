#!/opt/homebrew/bin/python3

import random
import copy
import sys
import csv
import configparser

#sample experiment that runs a truncation generational loop with a genome represented by a list of 0s and 1s. fitness is measured by number of 1s
#in genome. maximum fitness is measured at the given generation number.
#number of population, genome length, and mutation rate are given. a number can be given for seed or an r can be given for a random seed
# pylint: disable = W0612
# pylint: disable-next=pointless-string-statement
"""
This experiment demonstrates doing things with Post Processing.
To enable post processing check the scatter plot box and input the independent and dependant variables

To verify if it worked once the experiment is over you should be able to download a zip file with a scatter plot image within


Example settings for a run that demonstrates this:

Info:
File Output: geneticRes.csv

Parameters: -The parameters are shortened to make it easier to fill out
g: int, default: 1, min: 1, max: 10, step: 1 this is the generations variable
p: int, default: 60, min: 60, max: 100, step: 20 this is the population variable
gl: int, default: 1, min: 1, max: 20, step: 1 this is the genomeLength variable
mr: float, default: 0.2, min: 0.1, max: 0.8, step: 0.1 this is the mutationrate variable
seed: int, default: 1, min: 1, max: 1, step: 1 this is the seed variable

PostProcess:
Scatter Plot: checked
Independent Variable: gl
Dependant Variable: fitness

"""


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
    config = configparser.ConfigParser()
    args = sys.argv[1:]
    configFile = args[0]
    config.read(configFile)
    #takes in 5 arguments: generations, population, genome length, mutation rate, and seed
    generations = int(config["DEFAULT"]["g"])
    population = int(config["DEFAULT"]["p"])
    genomelength = int(config["DEFAULT"]["gl"])
    mutationrate = float(config["DEFAULT"]["mr"])
    seed = int(config["DEFAULT"]["seed"])
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
    with open('geneticRes.csv', 'w', encoding="utf8") as result:
        writer = csv.writer(result)
        writer.writerow(['fitness'])
        writer.writerow([chroms[0].fitness])
    print(chroms[0].fitness)
    return 0


if __name__ == "__main__":
    main()
