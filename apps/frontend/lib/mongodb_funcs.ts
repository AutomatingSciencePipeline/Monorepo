'use server';
import { GridFSBucket, ObjectId } from "mongodb";
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS, COLLECTION_SHARE_LINKS } from "./mongodb";
import { auth } from "../auth";
import { ExperimentData } from "./db_types";
import { cancelExperimentAsUser } from "./experimentCancel";
import type { CancelResult } from "./experimentCancel";
import { submitExperimentForUser } from "./experimentSubmission";
import { formatFilename, isObjectId } from "./serverUtils";

export async function submitExperiment(values: Partial<ExperimentData>, userId: string, userEmail: string, role: string, fileId: string) {
    'use server';
    if (!values || Object.prototype.toString.call(values) !== '[object Object]') {
        return Promise.reject(`Invalid experiment settings`);
    }
    const user = await getCurrentUser();
    if (user._id.toString() !== userId) {
        return Promise.reject(`User is not who they say they are`);
    }
    const expId = await submitExperimentForUser(values, user, fileId);
    if (expId === null) return Promise.reject(`File not found`);
    return expId;
}

export async function getDocumentFromId(expId: string) {
    'use server';
    const session = await auth();
    if (!session?.user?.id || !isObjectId(expId)) {
        return null;
    }
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const expDoc = await collection.findOne({
        _id: new ObjectId(expId),
        $or: [{ creator: session.user.id }, { sharedUsers: { $type: 'array', $in: [session.user.id] } }],
    });
    if (!expDoc) {
        return null;
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
    const { collection, query } = await getOwnedExperiment(expId);
    expId = query._id.toHexString();
    const client = await clientPromise;

    const deleted = await collection.deleteOne(query);

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

// Expected refusals are returned rather than thrown: in production Next.js replaces the message of
// an error thrown by a server action with a generic one, so the UI could not show why it failed.
export type CancelExperimentOutcome = { ok: true } | { ok: false; message: string };

export async function cancelExperimentById(expId: string): Promise<CancelExperimentOutcome> {
    'use server';
    const user = await getCurrentUser();
    if (!isObjectId(expId)) {
        throw new Error('Invalid experiment id');
    }

    const result = await cancelExperimentAsUser(expId, {
        userId: user._id.toString(),
        isAdmin: user.role === 'admin',
    });
    if (!result.ok) {
        return { ok: false, message: cancelErrorMessage(result) };
    }
    return { ok: true };
}

function cancelErrorMessage(result: Extract<CancelResult, { ok: false }>): string {
    switch (result.error) {
        case 'not_found':
        case 'forbidden':
            return 'You do not have permission to cancel this experiment';
        case 'not_cancellable':
            return `Experiment cannot be cancelled while ${result.status ?? 'in its current state'}`;
        case 'status_update_failed':
            return 'The experiment was stopped but its status could not be saved; please try again';
        default:
            return 'Failed to cancel experiment';
    }
}

export async function updateExperimentNameById(expId: string, newExpName: string) {
    'use server';
    const { collection, query } = await getOwnedExperiment(expId);

    const experiment = await collection.updateOne(query, { $set: { 'name': newExpName } });

    if (experiment.modifiedCount == 0) {
        return Promise.reject(`Could not update document with id: ${expId}`);
    }

    return Promise.resolve();
}

export async function updateExperimentTagsById(expId: string, newTags: string[]) {
    'use server';
    const { collection, query } = await getOwnedExperiment(expId);

    const experiment = await collection.updateOne(query, { $set: { 'tags': newTags } });

    if (experiment.modifiedCount == 0) {
        return Promise.reject(`Could not update document with id: ${expId}`);
    }

    return Promise.resolve();
}

export async function updateExperimentArchiveStatusById(expId: string, newStatus: string) {
    'use server';
    if (newStatus !== 'ARCHIVED' && newStatus !== 'UNARCHIVED') {
        return Promise.reject(`Invalid archive action`);
    }
    const { collection, query, document } = await getOwnedExperiment(expId);
    const terminalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED'];
    if (newStatus === 'ARCHIVED') {
        if (!terminalStatuses.includes(document.status)) return Promise.reject(`Experiment is not finished`);
    } else if (document.status !== 'ARCHIVED') {
        return Promise.reject(`Experiment is not archived`);
    }
    const restoredStatus = terminalStatuses.includes(document.archivedFromStatus)
        ? document.archivedFromStatus : (document.passes > 0 ? 'COMPLETED' : 'FAILED');
    const update = newStatus === 'ARCHIVED'
        ? { status: 'ARCHIVED', archivedFromStatus: document.status }
        : { status: restoredStatus, archivedFromStatus: null };
    const result = await collection.updateOne({ ...query, status: document.status }, { $set: update });
    if (result.matchedCount === 0) return Promise.reject(`Experiment state changed during archive update`);
}

export async function refreshFileTimestamp(fileId: string) {
    'use server';
    const user = await getCurrentUser();
    if (!isObjectId(fileId)) {
        return Promise.reject(`Invalid file ID`);
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const query = { _id: new ObjectId(fileId), 'metadata.userId': user._id.toString() };
    const file = await bucket.find(query).toArray();
    if (file.length === 0) {
        return Promise.reject(`Could not find file with id: ${fileId}`);
    }

    await db.collection('fileBucket.files').updateOne(
        query,
        { $set: { 'metadata.lastUsedDate': new Date() } }
    );

    return Promise.resolve();
}

export async function getRecentFiles(userId: string) {
    'use server';
    const user = await getCurrentUser();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const userFiles = await bucket.find({ "metadata.userId": user._id.toString() })
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
    const user = await getCurrentUser();
    const file = await getReadableFile(fileId, user._id.toString());
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });
    
    return new Promise<string>((resolve, reject) => {
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        const chunks: Buffer[] = [];

        downloadStream.on('data', (chunk) => {
            chunks.push(Buffer.from(chunk));
        });

        downloadStream.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const base64String = buffer.toString('base64');
                const dataUrl = `data:${file.contentType};base64,${base64String}`;
                resolve(dataUrl);
            } catch (err) {
                reject(err);
            }
        });

        downloadStream.on('error', (err) => {
            reject(err);
        });
    });
}

export async function copyFile(fileID: string, userId: string) {
    'use server';
    const user = await getCurrentUser();
    userId = user._id.toString();
    const fileData = await getReadableFile(fileID, userId);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    //First check if the user already has a file with the same hash
    const userFile = fileData.metadata?.hash
        ? await bucket.find({ "metadata.hash": fileData.metadata.hash, "metadata.userId": userId }).toArray()
        : [];
    if (userFile.length > 0) {
        return userFile[0]._id.toString();
    }

    const metadata = { ...fileData.metadata, userId, lastUsedDate: new Date() };

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
    const user = await getCurrentUser();
    if (!isObjectId(fileId)) {
        return Promise.reject(`Invalid file ID`);
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const query = { _id: new ObjectId(fileId), 'metadata.userId': user._id.toString() };
    const file = await bucket.find(query).toArray();
    if (file.length === 0) {
        return;
    }

    await db.collection('fileBucket.files').updateOne(
        query,
        { $set: { 'metadata.lastUsedDate': new Date() } }
    );
}

export async function addShareLink(expId: string) {
    'use server';
    await getOwnedExperiment(expId);
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
    const user = await getCurrentUser();
    if (user._id.toString() !== userId || typeof link !== 'string' || !link.trim()) {
        return Promise.reject(`User is not who they say they are`);
    }
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
    if (experiment.sharedUsers !== undefined && !Array.isArray(experiment.sharedUsers)) {
        return Promise.reject(`Invalid sharing metadata`);
    }
    if (experiment.sharedUsers?.includes(userId)) {
        return Promise.reject(`User already has access to this experiment`);
    }

    //Append that user to the sharedUsers array
    await collectionExperiments.updateOne({ '_id': ObjectId.createFromHexString(shareLink.experimentId) }, { $push: { 'sharedUsers': userId as any } });

    return Promise.resolve();
}

export async function unfollowExperiment(expId: string, userId: string) {
    'use server';
    const user = await getCurrentUser();
    if (user._id.toString() !== userId || !isObjectId(expId)) {
        return Promise.reject(`Invalid arguments`);
    }
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);

    const experiment = await collection.findOne({ '_id': new ObjectId(expId) });

    if (!experiment) {
        return Promise.reject(`Could not find experiment with id: ${expId}`);
    }

    if (!Array.isArray(experiment.sharedUsers) || !experiment.sharedUsers.includes(userId)) {
        return Promise.reject(`User does not have access to this experiment`);
    }

    await collection.updateOne({ '_id': new ObjectId(expId), sharedUsers: { $type: 'array', $in: [userId] } }, { $pull: { 'sharedUsers': userId as any } });

    return Promise.resolve();
}

export async function getUsers() {
    'use server';
    const currentUser = await getCurrentUser();
    if (currentUser.role !== 'admin') {
        return Promise.reject(`User is not an admin`);
    }
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
    const currentUser = await getCurrentUser();
    if (currentUser.role !== 'admin') {
        return Promise.reject(`User is not an admin`);
    }
    if (role !== 'admin' && role !== 'privileged' && role !== 'user') {
        return Promise.reject(`Invalid role: ${role}`);
    }
    if (!isObjectId(userId)) {
        return Promise.reject(`Invalid user ID`);
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
    if (!session?.user?.id || !isObjectId(expId)) return null;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const resultsBucket = new GridFSBucket(db, { bucketName: 'resultsBucket' });

    const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({ _id: new ObjectId(expId) });
    if (!experiment) return null;

    // Make sure the user is the creator or in the sharedUsers array
    if (experiment.creator !== session.user.id && (!Array.isArray(experiment.sharedUsers) || !experiment.sharedUsers.includes(session.user.id))) {
        return null;
    }

    const results = await resultsBucket.find({ 'metadata.experimentId': experiment._id.toHexString() }).toArray();
    if (results.length === 0) return null;

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
    if (!session?.user?.id || !isObjectId(expId)) return null;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const zipsBucket = new GridFSBucket(db, { bucketName: 'zipsBucket' });

    const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({ _id: new ObjectId(expId) });
    if (!experiment) return null;

    // Make sure the user is the creator or in the sharedUsers array
    if (experiment.creator !== session.user.id && (!Array.isArray(experiment.sharedUsers) || !experiment.sharedUsers.includes(session.user.id))) {
        return null;
    }

    const results = await zipsBucket.find({ 'metadata.experimentId': experiment._id.toHexString() }).toArray();
    if (results.length === 0) return null;

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
async function getOwnedExperiment(expId: string) {
    const user = await getCurrentUser();
    if (!isObjectId(expId)) {
        return Promise.reject(`Invalid experiment ID`);
    }
    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);
    const query = { _id: new ObjectId(expId), creator: user._id.toString() };
    const document = await collection.findOne(query);
    if (!document) {
        return Promise.reject(`Experiment not found`);
    }
    return { collection, query, document };
}

async function getReadableFile(fileId: string, userId: string) {
    if (!isObjectId(fileId)) {
        return Promise.reject(`Invalid file ID`);
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    const file = files[0];
    if (!file?.metadata?.userId) {
        return Promise.reject(`File not found`);
    }
    if (file.metadata.userId !== userId) {
        const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({
            file: new RegExp(`^${new ObjectId(fileId).toHexString()}$`, 'i'), creator: file.metadata.userId,
            sharedUsers: { $type: 'array', $in: [userId] },
        });
        if (!experiment) {
            return Promise.reject(`File not found`);
        }
    }
    return file;
}

async function getCurrentUser() {
    const session = await auth();
    if (!session?.user?.id) {
        return Promise.reject(`User is not authenticated`);
    }
    const userId = session.user.id;
    const client = await clientPromise;
    const user = await client.db(DB_NAME)
        .collection<{ _id: ObjectId | string; email?: string; role?: string }>('users')
        .findOne({ _id: isObjectId(userId) ? new ObjectId(userId) : userId });
    if (!user) {
        return Promise.reject(`User is not authenticated`);
    }
    return user;
}
