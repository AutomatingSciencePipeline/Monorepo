'use server'

import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "./mongodb";
import { ExperimentData } from "../firebase/db_types"; // Adjust the path
import { Document, WithId } from "mongodb";

// Function to listen to all experiments for a specific user and get the latest data every time there's a change
export async function fetchExperiments(
	uid: string // User ID to filter experiments by
) {
	const client = await clientPromise;
	const db = client.db(DB_NAME);
	const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

	// Fetch all experiments for the given user ID (creator field matches uid) on initial load
	const userExperiments = await experimentsCollection
		.find({ creator: uid })  // Filter experiments by user ID (creator)
		.toArray();

	console.log(userExperiments);

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

	return experimentsData
}
