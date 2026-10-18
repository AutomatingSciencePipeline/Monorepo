import csv
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest import mock

from modules import runner
from modules.data.configData import ConfigData
from modules.data.experiment import ExperimentData, ExperimentType
from modules.data.parameters import parseRawHyperparameterData
from modules.exceptions import InternalTrialFailedError, TrialTimeoutError

RESULT_FILE = "result.csv"


class TestConductExperiment(unittest.TestCase):
    """
    Runs conduct_experiment with the trial subprocess faked out: each trial either writes its result file,
    skips writing it (missing output), or times out.
    """

    def setUp(self):
        self.originalDir = os.getcwd()
        self.tempDir = tempfile.TemporaryDirectory()
        os.chdir(self.tempDir.name)
        self.dbUpdates = []

        patches = [
            mock.patch.object(runner, "update_exp_value", side_effect=lambda expId, field, value: self.dbUpdates.append((field, value))),
            # A single worker thread keeps the test in-process; config generation chdirs so it can't be multi-threaded
            mock.patch.object(runner, "ProcessPoolExecutor", lambda: ThreadPoolExecutor(max_workers=1)),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def tearDown(self):
        os.chdir(self.originalDir)
        self.tempDir.cleanup()

    def _make_experiment(self, numTrials: int):
        params = parseRawHyperparameterData([{"name": "x", "default": "1", "min": "1", "max": "2", "step": "1", "type": "integer", "useDefault": False}])
        configs = {f"config{n}": ConfigData(data={"x": str(n)}) for n in range(numTrials)}
        experiment = ExperimentData(
            expId="exp", creator="user", creatorRole="user", creatorEmail="user@example.com",
            trialExtraFile="", trialResult=RESULT_FILE, trialResultLineNumber=1, timeout=5, sendEmail=False,
            scatter=True, scatterIndVar="x", scatterDepVar="sum", dumbTextArea="", configFileFormat="ini", hyperparameters=params,
            configs=configs, experimentType=ExperimentType.PYTHON, totalExperimentRuns=numTrials,
        )
        return experiment

    def _fake_trials(self, behaviors: "dict[int, str]"):
        """behaviors maps trialNum -> 'ok' | 'missing' | 'timeout'"""
        def fake_run_trial(experiment, config_path, trialRun):
            os.mkdir(f'trial{trialRun}')
            if behaviors[trialRun] == "ok":
                with open(f'trial{trialRun}/{RESULT_FILE}', 'w', encoding="utf8") as file:
                    file.write(f"sum\n{trialRun + 10}\n")
            elif behaviors[trialRun] == "timeout":
                raise TrialTimeoutError(f"Trial {trialRun} timed out")
        patch = mock.patch.object(runner, "_run_trial", side_effect=fake_run_trial)
        patch.start()
        self.addCleanup(patch.stop)

    def _read_results(self):
        with open('results.csv', encoding="utf8") as file:
            return list(csv.reader(file))

    def test_all_trials_missing_output_is_failed(self):
        experiment = self._make_experiment(4)
        self._fake_trials({0: "missing", 1: "missing", 2: "missing", 3: "missing"})

        with self.assertLogs(runner.explogger, level="ERROR") as logs:
            runner.conduct_experiment(experiment)

        self.assertEqual(experiment.passes, 0)
        self.assertEqual(experiment.fails, 4)
        self.assertEqual(experiment.status, "FAILED")
        self.assertEqual([v for f, v in self.dbUpdates if f == "fails"], [1, 2, 3, 4])
        self.assertNotIn("passes", [f for f, v in self.dbUpdates])
        self.assertFalse(os.path.exists('results.csv'))
        # The original missing-file error is preserved, not replaced by a secondary crash
        logText = "\n".join(logs.output)
        self.assertIn(f"trial0/{RESULT_FILE}", logText)
        self.assertNotIn("writerow", logText)

    def test_mixed_outcomes_keep_successful_results(self):
        experiment = self._make_experiment(3)
        self._fake_trials({0: "missing", 1: "ok", 2: "timeout"})

        with self.assertLogs(runner.explogger, level="ERROR"):
            runner.conduct_experiment(experiment)

        self.assertEqual(experiment.passes, 1)
        self.assertEqual(experiment.fails, 2)
        self.assertEqual(experiment.status, "COMPLETED")
        self.assertEqual(self._read_results(), [
            ["Experiment Run", "sum", "x"],
            ["0", "ERROR", "0"],
            ["1", "11", "1"],
            ["2", "TIMEOUT", "2"],
        ])

    def test_all_trials_succeed(self):
        experiment = self._make_experiment(2)
        self._fake_trials({0: "ok", 1: "ok"})

        runner.conduct_experiment(experiment)

        self.assertEqual((experiment.passes, experiment.fails, experiment.status), (2, 0, "COMPLETED"))
        self.assertEqual(self._read_results()[1:], [["0", "10", "0"], ["1", "11", "1"]])



class TestDescribeError(unittest.TestCase):
    def test_glados_error_messages_are_included(self):
        # GLADOS errors store their text in .message, so str() on them is empty
        try:
            try:
                raise InternalTrialFailedError("errors returned from pipe is KeyError")
            except InternalTrialFailedError as inner:
                raise InternalTrialFailedError("Encountered another exception while reading pipe") from inner
        except InternalTrialFailedError as err:
            self.assertEqual(runner._describe_error(err),
                "Encountered another exception while reading pipe (caused by InternalTrialFailedError: errors returned from pipe is KeyError)")


if __name__ == '__main__':
    unittest.main()
