'use server';
import { GridFSBucket, ObjectId } from "mongodb";
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from "./mongodb";

export async function getDocumentFromId(expId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const expDoc = await collection.findOne({ "_id": new ObjectId(expId) });
    if (!expDoc) {
        return Promise.reject(`Could not find document with id: ${expId}`);
    }

    const expInfo = {
        hyperparameters: Array.isArray(expDoc.hyperparameters) ? expDoc.hyperparameters : [],
        name: expDoc.name || '',
        description: expDoc.description || '',
        trialExtraFile: expDoc.trialExtraFile || '',
        trialResult: expDoc.trialResult || '',
        verbose: expDoc.verbose || false,
        workers: expDoc.workers || 0,
        scatter: expDoc.scatter || '',
        dumbTextArea: expDoc.dumbTextArea || '',
        scatterIndVar: expDoc.scatterIndVar || '',
        scatterDepVar: expDoc.scatterDepVar || '',
        timeout: expDoc.timeout || 0,
        keepLogs: expDoc.keepLogs || false,
    };

    //just return the document
    return expDoc
}

export async function deleteDocumentById(expId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const deleted = await collection.deleteOne({ "_id": new ObjectId(expId) });

    if (deleted.deletedCount == 0) {
        return Promise.reject(`Could not find document with id: ${expId}`);
    }

    return Promise.resolve();
}

export async function updateExperimentNameById(expId: string, newExpName: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const experiment = await collection.updateOne({ '_id': new ObjectId(expId) }, { $set: { 'name': newExpName } });

    if (experiment.modifiedCount == 0) {
        return Promise.reject(`Could not update document with id: ${expId}`);
    }

    return Promise.resolve();
}

export async function getRecentFiles(userId: string) {
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const userFiles = await bucket.find({ "metadata.userId": userId })
        .sort({ uploadDate: -1 })
        .limit(5)
        .toArray();

    // Transform the data to be JSON-serializable
    const serializedFiles = userFiles.map(file => ({
        _id: file._id.toString(), // Convert ObjectId to string
        length: file.length,
        chunkSize: file.chunkSize,
        uploadDate: file.uploadDate.toISOString(), // Convert Date to ISO string
        filename: file.filename,
        metadata: file.metadata, // Assuming metadata is already serializable
    }));

    return serializedFiles;
}

