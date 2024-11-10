'use server';
import { ObjectId } from "mongodb";
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from "./mongodb";

export async function getDocumentFromId(expId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const expDoc = await collection.findOne({ "_id": new ObjectId(expId) });
    if (!expDoc) {
        return Promise.reject(`Could not find document with id: ${expId}`);
    }
    
    //just return the document
    return expDoc;
}