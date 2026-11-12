import 'server-only';
import { ObjectId } from 'mongodb';
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from './mongodb';
import type { ExperimentData } from './db_types';
import { isObjectId } from './serverUtils';

type SubmissionUser = { _id: string | ObjectId; email?: unknown; role?: unknown };

const EDITABLE_FIELDS = [
    'name', 'description', 'tags', 'workers', 'trialExtraFile', 'trialResult',
    'timeout', 'sendEmail', 'scatter', 'scatterIndVar', 'scatterDepVar',
    'dumbTextArea', 'hyperparameters', 'experimentExecutable', 'configFileFormat',
] as const satisfies readonly (keyof ExperimentData)[];

// Callers supply the identity from their verified Web session or CLI token.
export async function submitExperimentForUser(
    values: Partial<ExperimentData>, user: SubmissionUser, fileId: string,
): Promise<string | null> {
    if (!values || Object.prototype.toString.call(values) !== '[object Object]') {
        throw new Error('Invalid experiment settings');
    }
    if (!isObjectId(fileId)) {
        throw new Error('Invalid file ID');
    }

    const userId = user._id.toString();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const executable = await db.collection('fileBucket.files').findOne({
        _id: new ObjectId(fileId), 'metadata.userId': userId,
    });
    if (!executable) return null;

    const settings: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(values, field)) {
            settings[field] = values[field];
        }
    }
    const document = {
        ...settings,
        creator: userId,
        creatorEmail: typeof user.email === 'string' ? user.email : '',
        creatorRole: user.role === 'admin' || user.role === 'privileged' ? user.role : 'user',
        created: Date.now(),
        finished: false,
        estimatedTotalTimeMinutes: 0,
        totalExperimentRuns: 0,
        file: new ObjectId(fileId).toHexString(),
        trialResultLineNumber: Number(values.trialResultLineNumber || 1),
        sharedUsers: [],
        status: 'CREATED',
        passes: 0,
        fails: 0,
    };
    const result = await db.collection(COLLECTION_EXPERIMENTS).insertOne(document);
    if (result) return result.insertedId.toString();
    throw new Error('Failed to insert experiment data');
}
