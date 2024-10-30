'use client';
import { ChangeStream, WithId, Document } from "mongodb";
import { ExperimentData } from "../firebase/db_types";
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "./mongodb";

export const listenToExperiments = async (
	uid: string,
	callback: (experiments: Partial<ExperimentData>[]) => void
) => {
	const client = await clientPromise;
	const db = client.db(DB_NAME);
	const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

	// Match documents where 'creator' field equals 'uid'
	const pipeline = [{ $match: { "fullDocument.creator": uid } }];

	// Listen to changes in the experiments collection
	const changeStream: ChangeStream = experimentsCollection.watch(pipeline);

	changeStream.on("change", async () => {
		const updatedDocuments = await experimentsCollection
			.find({ creator: uid })
			.toArray();

		// Map documents to Partial<ExperimentData>[]
		const result: Partial<ExperimentData>[] = updatedDocuments.map((doc: WithId<Document>) => {
			const { _id, ...rest } = doc;
			return { id: _id.toString(), ...rest } as Partial<ExperimentData>;
		});

		callback(result);
	});

	// Return function to close the change stream and client connection
	return () => {
		changeStream.close();
		client.close();
	};
};