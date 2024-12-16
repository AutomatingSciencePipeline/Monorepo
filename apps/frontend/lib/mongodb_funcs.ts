'use server';
import { GridFSBucket, ObjectId } from "mongodb";
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS, COLLECTION_SHARE_LINKS } from "./mongodb";

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

export async function refreshFileTimestamp(fileId: string) {
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const file = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (file.length === 0) {
        return Promise.reject(`Could not find file with id: ${fileId}`);
    }

    await db.collection('fileBucket.files').updateOne(
        { _id: new ObjectId(fileId) },
        { $set: { 'metadata.lastUsedDate': new Date() } }
    );

    return Promise.resolve();
}

export async function getRecentFiles(userId: string) {
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const userFiles = await bucket.find({ "metadata.userId": userId })
        .sort({ "metadata.lastUsedDate": -1 })
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

export async function copyFile(fileID: string, userId: string){
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const file = await bucket.find({ _id: new ObjectId(fileID) }).toArray();
    if (file.length === 0) {
        return Promise.reject(`Could not find file with id: ${fileID}`);
    }

    //First check if the user already has a file with the same hash
    const userFile = await bucket.find({ "metadata.hash": file[0].metadata!.hash, "metadata.userId": userId }).toArray();
    console.log(userFile);
    if (userFile.length > 0) {
        return userFile[0]._id.toString();
    }

    const fileData = file[0];
    const metadata = fileData.metadata!;
    metadata.userId = userId;
    metadata.lastUsedDate = new Date();

    const downloadStream = bucket.openDownloadStream(new ObjectId(fileID));
    const uploadStream = bucket.openUploadStream(fileData.filename, { metadata });

    await new Promise((resolve, reject) => {
        downloadStream.pipe(uploadStream)
            .on('finish', resolve)
            .on('error', reject);
    });

    return uploadStream.id.toString();
}

export async function updateLastUsedDateFile(fileId: string) {
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const file = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (file.length === 0) {
        return;
    }

    await db.collection('fileBucket.files').updateOne(
        { _id: new ObjectId(fileId) },
        { $set: { 'metadata.lastUsedDate': new Date() } }
    );
}

export async function addShareLink(expId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_SHARE_LINKS);

    const shareLink = {
        experimentId: expId,
        link: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours from now
    };


    await collection.insertOne(shareLink);

    return shareLink.link;
}

export async function redeemShareLink(link: string, userId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_SHARE_LINKS);

    const shareLink = await collection.findOne({ link: link });

    if (!shareLink) {
        return Promise.reject(`Could not find share link with link: ${link}`);
    }

    if (shareLink.expiration < new Date()) {
        return Promise.reject(`Share link with link: ${link} has expired`);
    }

    // Delete the share link
    await collection.deleteOne({ _id: shareLink._id });

    // Give the user access to the experiment
    const collectionExperiments = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    //Check if the user is already in the sharedUsers array
    const experiment = await collectionExperiments.findOne({ '_id': ObjectId.createFromHexString(shareLink.experimentId) });
    //Check if the array exists first
    if (!experiment) {
        return Promise.reject(`Could not find experiment with id: ${shareLink.experimentId}`);
    }
    if (experiment.sharedUsers) {
        if (experiment.sharedUsers.includes(userId)) {
            return Promise.reject(`User already has access to this experiment`);
        }
    }

    //Append that user to the sharedUsers array
    await collectionExperiments.updateOne({ '_id': ObjectId.createFromHexString(shareLink.experimentId) }, { $push: { 'sharedUsers': userId as any } });

    return Promise.resolve();
}

export async function unfollowExperiment(expId: string, userId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const experiment = await collection.findOne({ '_id': new ObjectId(expId) });

    if (!experiment) {
        return Promise.reject(`Could not find experiment with id: ${expId}`);
    }

    if (experiment.sharedUsers) {
        if (!experiment.sharedUsers.includes(userId)) {
            return Promise.reject(`User does not have access to this experiment`);
        }
    }

    await collection.updateOne({ '_id': new ObjectId(expId) }, { $pull: { 'sharedUsers': userId as any } });

    return Promise.resolve();
}