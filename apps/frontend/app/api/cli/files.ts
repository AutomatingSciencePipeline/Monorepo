import 'server-only';
import { GridFSBucket, ObjectId } from 'mongodb';
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../lib/mongodb';

export async function fetchResultsFileCLI(expId: string, userId: string): Promise<| { contents: string; name: string }| { success: boolean; status: string }> {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const resultsBucket = new GridFSBucket(db, { bucketName: 'resultsBucket' });

    let objectId;

    try {
        objectId = new ObjectId(expId);
    } catch (err) {
        return { success: false, status: 'not_found'};
    }

    const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({ _id: objectId });
    if (!experiment) return { success: false, status: 'not_found'};

    // Make sure the user is the creator or in the sharedUsers array
    if (experiment.creator !== userId && (!experiment.sharedUsers || !experiment.sharedUsers.includes(userId))) {
        return { success: false, status: 'not_found'};
    }

    if(experiment.status == 'FAILED') return { success: false, status: 'exp_failed'};

    if(experiment.status != 'COMPLETED') return { success: false, status: 'not_done'};

    if(experiment.fails > 0) return { success: false, status: 'exp_failed'};

    const results = await resultsBucket.find({ 'metadata.experimentId': experiment._id.toHexString() }).toArray();
    if (results.length === 0)  return { success: false, status: 'not_done'};

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

export async function fetchProjectZipCLI(expId: string, userId: string): Promise<{ contents: string; name: string } | null> {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const zipsBucket = new GridFSBucket(db, { bucketName: 'zipsBucket' });

    const experiment = await db.collection(COLLECTION_EXPERIMENTS).findOne({ _id: new ObjectId(expId) });
    if (!experiment) return null;

    // Make sure the user is the creator or in the sharedUsers array
    if (experiment.creator !== userId && (!experiment.sharedUsers || !experiment.sharedUsers.includes(userId))) {
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
