
export const addNumsExpData = {
    "hyperparameters": "{\"hyperparameters\":[{\"name\":\"x\",\"default\":\"1\",\"min\":\"1\",\"max\":\"10\",\"step\":\"1\",\"type\":\"integer\"},{\"name\":\"y\",\"default\":\"1\",\"min\":\"1\",\"max\":\"10\",\"step\":\"1\",\"type\":\"integer\"}]}",
    "timeout": 18000,
    "trialExtraFile": "AddNumResult.csv",
    "workers": 1,
    "scatterDepVar": "",
    "scatterIndVar": "",
    "keepLogs": true,
    "creator": "DefaultRunner",
    "verbose": false,
    "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNums.py",
    "trialResult": "AddNumResult.csv",
    "dumbTextArea": "",
    "description": "",
    "name": "Add Nums Default Experiment Python",
    "scatter": false
}

export const multistringPy = {
    "hyperparameters": "{\"hyperparameters\":[{\"name\":\"x\",\"default\":\"1\",\"min\":\"1\",\"max\":\"10\",\"step\":\"1\",\"type\":\"integer\"},{\"name\":\"values\",\"default\":-1,\"values\":[\"a\",\"b\"],\"type\":\"stringlist\"},{\"name\":\"values2\",\"default\":-1,\"values\":[\"one\",\"two\"],\"type\":\"stringlist\"}]}",
    "timeout": 18000,
    "trialExtraFile": "stringResult.csv",
    "scatterDepVar": "",
    "scatterIndVar": "",
    "workers": 1,
    "keepLogs": true,
    "creator": "DefaultRunner",
    "verbose": false,
    "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/multiString.py",
    "trialResult": "stringResult.csv",
    "dumbTextArea": "",
    "description": "",
    "name": "Multi String Default Experiment Python",
    "scatter": false
}

export const geneticalgo = {
    "hyperparameters": "{\"hyperparameters\":[{\"name\":\"p\",\"default\":\"1\",\"min\":\"1\",\"max\":\"10\",\"step\":\"1\",\"type\":\"integer\"},{\"name\":\"g\",\"default\":\"60\",\"min\":\"60\",\"max\":\"100\",\"step\":\"20\",\"type\":\"integer\"}, {\"name\":\"gl\",\"default\":\"1\",\"min\":\"1\",\"max\":\"20\",\"step\":\"1\",\"type\":\"integer\"}, {\"name\":\"mr\",\"default\":\"0.2\",\"min\":\"0.1\",\"max\":\"0.8\",\"step\":\"0.1\",\"type\":\"float\"}, {\"name\":\"seed\",\"default\":-1,\"min\":\"1\",\"max\":\"10\",\"step\":\"1\",\"type\":\"integer\"}]}",
    "timeout": 18000,
    "trialExtraFile": "geneticRes.csv",
    "scatterDepVar": "",
    "scatterIndVar": "",
    "workers": 1,
    "keepLogs": true,
    "creator": "DefaultRunner",
    "verbose": false,
    "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/genetic_algorithm.py",
    "trialResult": "geneticRes.csv",
    "dumbTextArea": "",
    "description": "",
    "name": "Genetric Algorithm Default Experiment",
    "scatter": false
}