'use server';
import { GridFSBucket, ObjectId } from "mongodb";
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS, COLLECTION_SHARE_LINKS } from "./mongodb";
import { auth } from "../auth";
import { ExperimentData } from "./db_types";

export async function submitExperiment(values: Partial<ExperimentData>, userId: string, userEmail: string, role: string, fileId: string) {
    'use server';
    values.creator = userId;
    values.creatorEmail = userEmail;
    values.creatorRole = role;
    values.created = Date.now();

    // Convert hours to seconds for timeout
    values.timeout! *= 3600;
    values.finished = false;
    values.estimatedTotalTimeMinutes = 0;
    values.totalExperimentRuns = 0;
    values.file = fileId;
    // Make sure that the trialResultLineNumber is a number, not a string
    if (!values.trialResultLineNumber) {
        values.trialResultLineNumber = 1;
    }
    values.trialResultLineNumber = Number(values.trialResultLineNumber);
    const expData: Partial<ExperimentData> = values;

    const session = await auth();
    // Make sure that the user is who they say they are
    if (!session) {
        return Promise.reject(`User is not authenticated`);
    }
    if (session.user?.id !== userId) {
        return Promise.reject(`User is not who they say they are`);
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const result = await db.collection(COLLECTION_EXPERIMENTS).insertOne(expData);

    if (result){
        return Promise.resolve(result.insertedId.toString());
    }
    else {
        return Promise.reject(`Failed to insert experiment data`);
    }
}

export async function getDocumentFromId(expId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const expDoc = await collection.findOne({ "_id": new ObjectId(expId) });
    if (!expDoc) {
        return Promise.reject(`Could not find document with id: ${expId}`);
    }

    // Make a new object with the same properties as expDoc, but with the _id property as a string
    const expDocWithStringId = {
        ...expDoc,
        _id: expDoc._id.toString(),
    };

    //just return the document
    return expDocWithStringId;
}

export async function deleteDocumentById(expId: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const deleted = await collection.deleteOne({ "_id": new ObjectId(expId) });

    if (deleted.deletedCount == 0) {
        return Promise.reject(`Could not find document with id: ${expId}`);
    }

    //Since we found it, make sure to delete data from logs, results, and zips
    const db = client.db(DB_NAME);
    //Delete logs from bucket
    const logsBucket = new GridFSBucket(db, { bucketName: 'logsBucket' });
    const filesToDelete = await logsBucket.find({ "metadata.experimentId": expId }).toArray();
    for (const file of filesToDelete) {
        await logsBucket.delete(file._id);
    }
    //Delete results from bucket
    const resultsBucket = new GridFSBucket(db, { bucketName: 'resultsBucket' });
    const resultsToDelete = await resultsBucket.find({ "metadata.experimentId": expId }).toArray();
    for (const file of resultsToDelete) {
        await resultsBucket.delete(file._id);
    }
    //Delete zips from bucket
    const zipsBucket = new GridFSBucket(db, { bucketName: 'zipsBucket' });
    const zipsToDelete = await zipsBucket.find({ "metadata.experimentId": expId }).toArray();
    for (const file of zipsToDelete) {
        await zipsBucket.delete(file._id);
    }

    return Promise.resolve();
}

export async function cancelExperimentById(expId: string) {
    'use server';
    //Call the backend at the endpoint to cancel the experiment
    const BACKEND_PORT = process.env.BACKEND_PORT || '5050';
    const url = `http://glados-service-backend:${BACKEND_PORT}/cancelExperiment`;
    //Just post a json object with the experiment id
    const backendResponse = await fetch(url, {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ jobName: 'runner-' + expId }),
    });

    //Mark the experiment as completed
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);
    await collection
        .updateOne({ '_id': new ObjectId(expId) }, { $set: { 'finished': true } });

    await collection
        .updateOne({ '_id': new ObjectId(expId) }, { $set: { 'status': 'CANCELLED' } });

    //If the backend returns a 200 status code, the experiment was successfully cancelled
    if (backendResponse.status === 200) {
        return Promise.resolve(true);
    } else {
        return Promise.resolve(false);
    }

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

export async function updateExperimentArchiveStatusById(expId: string, newStatus: string) {
    'use server';
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const experiment = await collection.updateOne({ '_id': new ObjectId(expId) }, { $set: { 'status': newStatus } });

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

export async function downloadFile(fileId: string) {
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });
    const file = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    const session = await auth();
    if (!session) {
        return Promise.reject(`User not authenticated`);
    }
    if (file.length === 0) {
        return Promise.reject(`Could not find file with id: ${fileId}`);
    }
    
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    const chunks: Buffer[] = [];
    downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
    });
    downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
        // Convert the buffer to a base64 string
        const base64String = buffer.toString('base64');
        // Create a data URL
        const dataUrl = `data:${file[0].contentType};base64,${base64String}`;
        return Promise.resolve(dataUrl);
    });
    downloadStream.on('error', (err) => {
        return Promise.reject(`Error downloading file: ${err}`);
    });
    return downloadStream;
}

export async function copyFile(fileID: string, userId: string) {
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
        // Delete the share link
        await collection.deleteOne({ _id: shareLink._id });
        return Promise.reject(`Share link with link: ${link} has expired`);
    }

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

export async function getUsers() {
    'use server';
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    const usersList = await users.find().toArray();

    // Transform the data to be JSON-serializable
    const serializedUsers = usersList.map(user => ({
        _id: user._id.toString(), // Convert ObjectId to string
        email: user.email,
        role: user.role
    }));

    return serializedUsers;
}

export async function updateUserRole(userId: string, role: string) {
    'use server';
    if (role !== 'admin' && role !== 'privileged' && role !== 'user') {
        return Promise.reject(`Invalid role: ${role}`);
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const users = db.collection('users');

    await users.updateOne({ '_id': new ObjectId(userId) }, { $set: { 'role': role } });

    return Promise.resolve();
}

export async function fetchResultsFile(expId: string): Promise<{ contents: string; name: string } | null> {
    'use server';
    const session = await auth();
    if (!session) return null;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const resultsBucket = new GridFSBucket(db, { bucketName: 'resultsBucket' });

    const results = await resultsBucket.find({ 'metadata.experimentId': expId }).toArray();
    if (results.length === 0) return null;

    const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({ _id: new ObjectId(expId) });
    if (!experiment) return null;

    // Make sure the user is the creator or in the sharedUsers array
    if (experiment.creator !== session?.user?.id && (!experiment.sharedUsers || !experiment.sharedUsers.includes(session.user?.id))) {
        return null;
    }

    const expName = experiment.name;
    const expCreated = experiment.created;

    const downloadStream = resultsBucket.openDownloadStream(results[0]._id);
    const chunks: Buffer[] = [];

    const contents = await new Promise<string>((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('end', () => resolve(Buffer.concat(chunks as unknown as Uint8Array[]).toString('utf-8')));
        downloadStream.on('error', reject);
    });

    return {
        contents,
        name: formatFilename(expName, expCreated, 'csv'),
    };
}

export async function fetchProjectZip(expId: string): Promise<{ contents: string; name: string } | null> {
    'use server';
    const session = await auth();
    if (!session) return null;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const zipsBucket = new GridFSBucket(db, { bucketName: 'zipsBucket' });

    const results = await zipsBucket.find({ 'metadata.experimentId': expId }).toArray();
    if (results.length === 0) return null;

    const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({ _id: new ObjectId(expId) });
    if (!experiment) return null;

    // Make sure the user is the creator or in the sharedUsers array
    if (experiment.creator !== session?.user?.id && (!experiment.sharedUsers || !experiment.sharedUsers.includes(session.user?.id))) {
        return null;
    }

    const expName = experiment.name;
    const expCreated = experiment.created;

    const downloadStream = zipsBucket.openDownloadStream(results[0]._id);
    const chunks: Buffer[] = [];

    const contents = await new Promise<string>((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('end', () => resolve(Buffer.concat(chunks as unknown as Uint8Array[]).toString('base64')));
        downloadStream.on('error', reject);
    });

    return {
        contents,
        name: formatFilename(expName, expCreated, 'zip'),
    };
}

// Auxiliary functions, keep at the bottom of the file
const formatFilename = (name: string, timestamp: string, extension: string) => {
    const formattedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const formattedTimestamp = formatTimestamp(timestamp);
    return `${formattedName}_${formattedTimestamp}.${extension}`;
};

const formatTimestamp = (timestamp: string) => {
    const partiallyFormattedTimestamp = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
    let formatted = partiallyFormattedTimestamp.replace(/Z$/, '');
    formatted = formatted.replace('T', '_');
    const [date, time] = formatted.split('_');
    const timeParts = time.split('-');
    let hours = parseInt(timeParts[0], 10) - 5;
    timeParts[0] = hours.toString();
    const formattedTime = timeParts.join('-');
    return `${date}_${formattedTime}`;
};