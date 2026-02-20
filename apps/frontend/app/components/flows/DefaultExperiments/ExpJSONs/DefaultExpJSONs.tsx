
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
    "timeout": 5,
    "trialExtraFile": "AddNumResult.csv",
    "workers": 1,
    "trialResultLineNumber": 0,
    "scatterDepVar": "",
    "scatterIndVar": "",
    "keepLogs": true,
    "sendEmail": false,
    "creator": "DefaultRunner",
    "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNums.py",
    "trialResult": "AddNumResult.csv",
    "dumbTextArea": "",
    "description": "",
    "name": "Add Nums Default Experiment Python",
    "scatter": false,
    "experimentExecutable": ""
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
    "timeout": 5,
    "trialExtraFile": "stringResult.csv",
    "trialResultLineNumber": 0,
    "scatterDepVar": "",
    "scatterIndVar": "",
    "workers": 1,
    "keepLogs": true,
    "sendEmail": false,
    "creator": "DefaultRunner",
    "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/multiString.py",
    "trialResult": "stringResult.csv",
    "dumbTextArea": "",
    "description": "",
    "name": "Multi String Default Experiment Python",
    "scatter": false,
    "experimentExecutable": ""
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
    "timeout": 5,
    "trialExtraFile": "geneticRes.csv",
    "scatterDepVar": "",
    "scatterIndVar": "",
    "workers": 1,
    "trialResultLineNumber": 0,
    "keepLogs": true,
    "sendEmail": false,
    "creator": "DefaultRunner",
    "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/genetic_algorithm.py",
    "trialResult": "geneticRes.csv",
    "dumbTextArea": "",
    "description": "",
    "name": "Genetic Algorithm Default Experiment",
    "scatter": false,
    "experimentExecutable": ""
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
        ],
        "labels for graphing (not real parameter)": [
          "10-20",
          "20-10",
          "1-2",
          "2-1",
          "5-15",
          "15-5"
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
  "timeout": 5,
  "scatter": false,
  "keepLogs": true,
  "sendEmail": false,
  "workers": 1,
 "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/addNums.py",
  "status": "CREATED",
  "experimentExecutable": ""
}

export const bistreamEvo = {
  "hyperparameters": [
    {
      "name": "population_size",
      "default": -1,
      "min": "2",
      "max": "5",
      "step": 1,
      "type": "integer",
      "useDefault": false
    },
    {
      "name": "mutation_probability",
      "default": -1,
      "min": "0.1",
      "max": "0.2",
      "step": "0.1",
      "type": "float",
      "useDefault": false
    },
    {
      "name": "crossover_probability",
      "default": -1,
      "min": "0.1",
      "max": "0.2",
      "step": "0.1",
      "type": "float",
      "useDefault": false
    },
    {
      "name": "elitism_fraction",
      "default": -1,
      "min": "0.1",
      "max": "0.2",
      "step": "0.1",
      "type": "float",
      "useDefault": false
    }
  ],
  "name": "Bitstream Evolution",
  "description": "",
  "trialExtraFile": "",
  "trialResult": "workspace/bestlivedata.log",
  "trialResultLineNumber": -1,
  "scatterIndVar": "",
  "scatterDepVar": "",
  "dumbTextArea": "[TOP-LEVEL PARAMETERS]\nsimulation_mode = FULLY_SIM\n \n[FITNESS PARAMETERS]\nfitness_func = VARIANCE\ndesired_freq = 10000\ncombined_mode = MULT\npulse_weight = 2\nvar_weight = 0\nnum_samples = 1\nnum_passes = 1\n \n[GA PARAMETERS]\npopulation_size = {population_size}\nmutation_probability = {mutation_probability}\ncrossover_probability = {crossover_probability}\nelitism_fraction = {elitism_fraction}\nselection = FIT_PROP_SEL\ndiversity_measure = NONE\nrandom_injection = 0.0\n \n[INITIALIZATION PARAMETERS]\ninit_mode = CLONE_SEED_MUTATE\nrandomize_until = NO\nrandomize_threshold = 4\nrandomize_mode = RANDOM\n \n[STOPPING CONDITION PARAMETERS]\ngenerations = 500\ntarget_fitness = IGNORE\n \n[PLOTTING PARAMETERS]\nlaunch_plots = false\nframe_interval = 10000\n \n[FITNESS SENSITIVITY PARAMETERS]\ntest_circuit = data/test.asc\nsensitivity_trials = IGNORE\nsensitivity_time = 24:00:00\n \n[TRANSFERABILITY PARAMETERS]\ntransfer_interval = IGNORE\nfpga2 = i:0x0403:0x6010:0\n \n[LOGGING PARAMETERS]\nlog_level = 4\nsave_log = true\nsave_plots = false\nbackup_workspace = true\npopulation_bitstream_save_interval = 10\nlog_file = ./workspace/log\nplots_dir = ./workspace/plots\noutput_dir = ./prev_workspaces\nfinal_experiment_dir = ./experiments\nasc_dir = ./workspace/experiment_asc\nbin_dir = ./workspace/experiment_bin\ndata_dir = ./workspace/experiment_data\nanalysis = ./workspace/analysis\nbest_file = ./workspace/best.asc\ngenerations_dir = ./workspace/generations\nsrc_populations_dir = ./workspace/source_populations\ndatetime_format = %%m/%%d/%%Y - %%H:%%M:%%S\nshow_ovr_best = true\nmonitor_file = ./data/monitor\n \n[SYSTEM PARAMETERS]\nfpga = i:0x0403:0x6010:0\nusb_path = /dev/ttyUSB0\nauto_upload_to_arduino = false\n \n[HARDWARE PARAMETERS]\nrouting = MOORE\nmcu_read_timeout = 1.1\nserial_baud = 115200\naccessed_columns = 14,15,24,25,40,41\nconfigurable_io = false\ninput_pins = 45,47,48\noutput_pins = 44",
  "timeout": 5,
  "scatter": false,
  "keepLogs": true,
  "sendEmail": false,
  "workers": 1,
  "file": "https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/example_experiments/python/BitstreamEvolution.zip",
  "status": "CREATED",
  "experimentExecutable": "src/evolve.py"
}