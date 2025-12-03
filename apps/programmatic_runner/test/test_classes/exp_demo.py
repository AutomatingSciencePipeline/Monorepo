from core.experiment import Experiment
import matplotlib.pyplot as plt
import os
class MyExperiment(Experiment):
    def __init__(self, save_path):
        hyperparams = {
            #variable : (start, stop, step_size)
            "x" : (0, 50, 1),
            "b" : (2, 2, 0),
            "m" : (0.5, 0.5, 0)
        }

        super().__init__(hyperparams,
                         save_path=save_path)
    

    def process_trial(self, data):
        # your defined function here
        # e.g. compute f(x, y, z)
        y = (data["m"] * data.get("x")) + data.get("b")

        return {"y" : y}
    
    def graph_result(self, data, save_path):
        plt.plot(data["x"], data["y"], marker='o', linestyle='--', color='blue') # Added marker, linestyle, color for customization

        # Customize the plot
        plt.xlabel("x")
        plt.ylabel("y")
        plt.title("test_graph")
        plt.grid(True) # Add a grid
        
        
        addr = os.path.join(save_path, "plot.png")
        plt.savefig(addr)
        plt.close()



def main():
    new_exp = MyExperiment() 
    new_exp.doExperiment()
            
            

if __name__ == "__main__":
    main()