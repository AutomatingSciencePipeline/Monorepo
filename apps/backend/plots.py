import numpy as np
import os
import csv
import matplotlib.pyplot as plt

def scatterPlot(independantVar, dependantVar, resultFile, id):

    x, y = [], []
    with open(resultFile) as file:
        csvreader = csv.reader(file)
        fields = next(csvreader)
        indIndex = fields.index(independantVar)
        depIndex = fields.index(dependantVar)
        for row in csvreader:
            x.append(float(row[indIndex]))
            y.append(float(row[depIndex]))

    fig, ax = plt.subplots()
    print(np.array(x))
    print(np.array(y))
    m, b = np.polyfit(np.array(x), np.array(y), 1)
    sc = ax.scatter(x,y)
    plt.plot(x, m*np.array(x) + b)
    ax.set_ylabel(dependantVar, loc='top')
    ax.set_xlabel(independantVar, loc='left')
    try:
        os.chdir('ResCsvs')
        plt.savefig(f'scatter{id}.png')
        os.chdir('..')
    except Exception as err:
        print(f"error during saving graph: {err}")
