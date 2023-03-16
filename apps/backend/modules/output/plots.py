import os
import csv
import numpy as np
import matplotlib.pyplot as plt

from modules.exceptions import FileHandlingError

def generateScatterPlot(independentVar, dependantVar, resultFile, expId):

    x, y = [], []
    with open(resultFile) as file:
        csvreader = csv.reader(file)
        fields = next(csvreader)
        indIndex = fields.index(independentVar)
        depIndex = fields.index(dependantVar)
        for row in csvreader:
            x.append(float(row[indIndex]))
            y.append(float(row[depIndex]))

    figure, axes = plt.subplots()
    print(np.array(x))
    print(np.array(y))
    m, b = np.polyfit(np.array(x), np.array(y), 1)
    sc = axes.scatter(x,y)
    plt.plot(x, m*np.array(x) + b)
    axes.set_ylabel(dependantVar, loc='top')
    axes.set_xlabel(independentVar, loc='left')
    try:
        os.chdir('ResCsvs')
        plt.savefig(f'scatter{expId}.png')
        os.chdir('..')
    except Exception as err:
        raise FileHandlingError("Error saving graph") from err
