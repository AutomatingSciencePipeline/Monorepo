'use server'

import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "./mongodb";
import { ExperimentData } from "../firebase/db_types"; // Adjust the path
import { ChangeStream, Document, WithId } from "mongodb";

// This callback will be triggered with all experiments for the given user
export interface ExperimentSubscribeCallback {
  (data: ExperimentData[]): void;  // Full list of ExperimentData objects for the user
}

// Function to listen to all experiments for a specific user and get the latest data every time there's a change
export async function listenToExperiments(
  uid: string, // User ID to filter experiments by
  callback: ExperimentSubscribeCallback
) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

  // Fetch all experiments for the given user ID (creator field matches uid) on initial load
  const userExperiments = await experimentsCollection
    .find({ creator: uid })  // Filter experiments by user ID (creator)
    .toArray();

  // Map the initial experiments to the correct format
  const experimentsData: ExperimentData[] = userExperiments.map((doc: WithId<Document>) => ({
    id: doc._id.toString(),
    name: doc.name || "Untitled",
    creator: doc.creator || "Unknown",
    description: doc.description || "No description",
    verbose: doc.verbose ?? false,
    workers: doc.workers ?? 0,
    expId: doc.expId || "",
    trialExtraFile: doc.trialExtraFile || "",
    trialResult: doc.trialResult || "",
    timeout: doc.timeout ?? 0,
    keepLogs: doc.keepLogs ?? false,
    scatter: doc.scatter ?? false,
    scatterIndVar: doc.scatterIndVar || "",
    scatterDepVar: doc.scatterDepVar || "",
    dumbTextArea: doc.dumbTextArea || "",
    created: doc.created?.toString() || "0",
    hyperparameters: doc.hyperparameters ?? {},
    finished: doc.finished ?? false,
    estimatedTotalTimeMinutes: doc.estimatedTotalTimeMinutes ?? 0,
    expToRun: doc.expToRun ?? 0,
    file: doc.file || "",
    startedAtEpochMillis: doc.startedAtEpochMillis ?? 0,
    finishedAtEpochMilliseconds: doc.finishedAtEpochMilliseconds ?? 0,
    passes: doc.passes ?? 0,
    fails: doc.fails ?? 0,
    totalExperimentRuns: doc.totalExperimentRuns ?? 0,
  }));

  // Trigger the callback with the initial set of experiments
  callback(experimentsData);

  // Listen for changes in the experiments collection (insert, update, delete)
  const changeStream: ChangeStream = experimentsCollection.watch();

  changeStream.on("change", async () => {
    // Fetch all experiments for the given user ID (creator field matches uid)
    const updatedUserExperiments = await experimentsCollection
      .find({ creator: uid })
      .toArray();

    const updatedExperimentsData: ExperimentData[] = updatedUserExperiments.map((doc: WithId<Document>) => ({
      id: doc._id.toString(),
      name: doc.name || "Untitled",
      creator: doc.creator || "Unknown",
      description: doc.description || "No description",
      verbose: doc.verbose ?? false,
      workers: doc.workers ?? 0,
      expId: doc.expId || "",
      trialExtraFile: doc.trialExtraFile || "",
      trialResult: doc.trialResult || "",
      timeout: doc.timeout ?? 0,
      keepLogs: doc.keepLogs ?? false,
      scatter: doc.scatter ?? false,
      scatterIndVar: doc.scatterIndVar || "",
      scatterDepVar: doc.scatterDepVar || "",
      dumbTextArea: doc.dumbTextArea || "",
      created: doc.created?.toString() || "0",
      hyperparameters: doc.hyperparameters ?? {},
      finished: doc.finished ?? false,
      estimatedTotalTimeMinutes: doc.estimatedTotalTimeMinutes ?? 0,
      expToRun: doc.expToRun ?? 0,
      file: doc.file || "",
      startedAtEpochMillis: doc.startedAtEpochMillis ?? 0,
      finishedAtEpochMilliseconds: doc.finishedAtEpochMilliseconds ?? 0,
      passes: doc.passes ?? 0,
      fails: doc.fails ?? 0,
      totalExperimentRuns: doc.totalExperimentRuns ?? 0,
    }));

    // Trigger the callback with the updated list of experiments
    callback(updatedExperimentsData);
  });

  // Return a cleanup function to close the change stream and client connection
  return async () => {
    changeStream.close();
    client.close();
  };
}
