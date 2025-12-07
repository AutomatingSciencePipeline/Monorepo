
from multiprocessing import Pool
from core.util.data import preprocess_ranges
import itertools, os
import pandas as pd

class Experiment:
    def __init__(self, 
                 hyperparams, 
                 save_path='./', 
                 csv_name='output.csv'):
        
        self.hyperparams = hyperparams
        self.save_path = save_path
        self.csv_name = csv_name

    def prepData(self, hyperparams):
        ranges = []
        for name, rng in hyperparams.items():
            try:
                ranges.append(preprocess_ranges(name, rng))
            except Exception as e:
                raise e
        
        names, value_lists = zip(*ranges)

        for combo in itertools.product(*value_lists): # compute product
            yield dict(zip(names, combo))

    def batched_product(self, hyperparams, batch_size=5):
        generator = self.prepData(hyperparams)
        while True:
            batch = list(itertools.islice(generator, batch_size))
            if not batch:
                break
            yield batch

    def parallel_process_batches(self, hyperparams, batch_size=10, num_workers=5):
        with Pool(processes=num_workers) as pool:
            for result in pool.imap_unordered(
                self.process_batch,
                self.batched_product(hyperparams, batch_size),
                chunksize=1
            ):
                yield result

    def transform_result(self, data):
        result = {}

        for batch in data:
            for d in batch:
                for key, value in d.items():
                    result.setdefault(key, []).extend([value])
        
        return result

    def doExperiment(self):
        result = self.parallel_process_batches(self.hyperparams)
        transformed_result = self.transform_result(result)
        
        self.serialize_result(transformed_result, self.save_path, self.csv_name)
        self.graph_result(transformed_result, self.save_path)
        
        
    def serialize_result(self, data, path, name):
        df = pd.DataFrame(data) 
        df.to_csv(os.path.join(path, name), index=False)

    def process_batch(self, batch):
        results = []
        for p in batch:
            r = self.process_trial(p)

            results.append({**p, **r})

        return results
    
    # User Defined Funtions
    def process_trial(self, data):
        pass
    
    def graph_result(self, data, save_path):
        pass

