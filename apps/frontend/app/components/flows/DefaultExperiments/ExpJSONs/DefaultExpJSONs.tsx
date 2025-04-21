
export const addNumsExpData = {
    "hyperparameters": [
        {
          "name": "x",
          "default": -"1",
          "min": "1",
          "max": "10",
          "step": "1",
          "type": "integer",
          "useDefault": false
        },
        {
            "name": "y",
            "default": -"1",
            "min": "1",
            "max": "10",
            "step": "1",
            "type": "integer",
            "useDefault": false
          },
    ],
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
    "hyperparameters": [
        {
          "name": "x",
          "default": -1,
          "min": "1",
          "max": "10",
          "step": "1",
          "type": "integer",
          "useDefault": false
        },
        {
          "name": "values",
          "default": -1,
          "values": [
            "a",
            "b"
          ],
          "type": "stringlist",
          "useDefault": false
        },
        {
          "name": "values2",
          "default": -1,
          "values": [
            "one",
            "two",
            "three"
          ],
          "type": "stringlist",
          "useDefault": false
        }
      ],
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
    "hyperparameters": [
    {
      "name": "g",
      "default": "1",
      "min": "1",
      "max": "10",
      "step": "1",
      "type": "integer",
      "useDefault": true
    },
    {
      "name": "p",
      "default": "60",
      "min": "60",
      "max": "100",
      "step": "20",
      "type": "integer",
      "useDefault": true
    },
    {
      "name": "gl",
      "default": "1",
      "min": "1",
      "max": "20",
      "step": "1",
      "type": "integer",
      "useDefault": true
    },
    {
      "name": "seed",
      "default": "-1",
      "min": "1",
      "max": "10",
      "step": "1",
      "type": "integer",
      "useDefault": false
    },
    {
      "name": "mr",
      "default": "0.2",
      "min": "0.1",
      "max": "0.8",
      "step": "0.1",
      "type": "float",
      "useDefault": true
    }
  ],
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
    "name": "Genetic Algorithm Default Experiment",
    "scatter": false
}

export const paramGroupDefault =  {
  "hyperparameters": [
    {
      "name": "nums",
      "default": -1,
      "params": {},
      "type": "paramgroup",
      "useDefault": false,
      "values": {
        "x": [
          "10",
          "20",
          "1",
          "2",
          "5",
          "15"
        ],
        "y": [
          "20",
          "10",
          "2",
          "1",
          "15",
          "5"
        ]
      }
    }
  ],
  "name": "Add Nums Param Group Default Experiment Python",
  "description": "",
  "trialExtraFile": "AddNumResult.csv",
  "trialResult": "AddNumResult.csv",
  "trialResultLineNumber": 0,
  "scatterIndVar": "",
  "scatterDepVar": "",
  "dumbTextArea": "",
  "timeout": 18000,
  "verbose": false,
  "scatter": false,
  "keepLogs": true,
  "workers": 1,
 "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNums.py",
  "status": "CREATED",
  "experimentExecutable": ""
}
