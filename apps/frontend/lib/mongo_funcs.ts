'use server'
import { ExperimentDocumentId } from "../firebase/db";
import { ExperimentData } from "../firebase/db_types";
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "./mongodb";
import { ChangeStream, WithId, Document } from "mongodb";

export interface ExperimentSubscribeCallback {
	(data: Partial<ExperimentData>): any;
}

// TODO: Convert from Firestore to MongoDB
export const subscribeToExp = async (id: ExperimentDocumentId, callback: ExperimentSubscribeCallback) => {
	"use server";
    const client = await clientPromise;
	const db = client.db(DB_NAME);
	const collection = db.collection(COLLECTION_EXPERIMENTS);
	const changeStream = collection.watch();
	changeStream.on('change', next => {
		if (next.operationType === 'update' && next.documentKey._id.toString() === id)
		{
			const data = collection.findOne({ '_id': id as any }) as Partial<ExperimentData>;
			callback(data);
		}
	});
};


export async function listenToExperiments(
	uid: string,
	callback: (experiments: Partial<ExperimentData>[]) => void
){
	"use server";
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
	return async () => {
		"use server";
		changeStream.close();
		client.close();
	};
};

