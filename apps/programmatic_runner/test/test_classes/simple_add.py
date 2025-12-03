from core.experiment import Experiment

class MyAddExperiment(Experiment):
    def __init__(self, save_path):
        hyperparams = {
            #variable : (start, stop, step_size)
            "x" : (0, 5, 1),
            "y" : (1, 2, 1)
        }

        super().__init__(hyperparams,
                         save_path=save_path)
    

    def process_trial(self, data):
        r = data["x"] + data["y"]

        return {"r" : r}
    
    def graph_result(self, data, save_path):
        pass
