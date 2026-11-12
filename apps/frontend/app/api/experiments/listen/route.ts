// app/api/experiments/stream-by-uid/route.ts

import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { WithId, Document } from 'mongodb';
import { NextRequest } from 'next/server';
import { auth } from '../../../../auth';
import { createAuthorizedExperimentStream } from '../../../../lib/authorizedExperimentStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const uid = req.nextUrl.searchParams.get('uid');

    if (!uid) {
        return new Response('Missing UID', { status: 400 });
    }

    // Make sure that the user is listening to their own experiments
    if (session.user?.id !== uid) {
        return new Response('Unauthorized', { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    const pipeline = [
        {
            $match: {
                $or: [
                    { 'fullDocument.creator': uid },
                    { operationType: 'delete', 'documentKey._id': { $exists: true } },
                    { operationType: 'replace' },
                    { 'fullDocument.sharedUsers': { $in: [uid] } },
                    { operationType: 'update', 'updateDescription.updatedFields.sharedUsers': { $nin: [uid] } },
                ],
            },
        },
    ];
    const stream = createAuthorizedExperimentStream({
        signal: req.signal,
        watch: experimentsCollection.watch(pipeline, { fullDocument: 'updateLookup' }),
        isAuthorized: async () => (await auth())?.user?.id === uid,
        query: async () => convertToExpsArray(await experimentsCollection
            .find({ $or: [{ creator: uid }, { sharedUsers: { $type: 'array', $in: [uid] } }] })
            .toArray()),
        invalidatesSnapshot: (change) => {
            if (change.operationType !== 'update') return change.operationType !== 'insert';
            const fields = [
                ...Object.keys(change.updateDescription.updatedFields ?? {}),
                ...(change.updateDescription.removedFields ?? []),
                ...(change.updateDescription.truncatedArrays ?? []).map((array) => array.field),
            ];
            return fields.some((field) => field === 'creator' || field === 'sharedUsers' || field.startsWith('sharedUsers.'));
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}

function convertToExpsArray(arr: WithId<Document>[]) {
    return arr.map((doc: WithId<Document>) => ({
        id: doc._id.toString(),
        name: doc.name || 'Untitled',
        creator: doc.creator || 'Unknown',
        description: doc.description || 'No description',
        tags: doc.tags ?? [],
        workers: doc.workers ?? 0,
        expId: doc._id || '',
        trialExtraFile: doc.trialExtraFile || '',
        trialResult: doc.trialResult || '',
        trialResultLineNumber: doc.trialResultLineNumber ?? 0,
        timeout: doc.timeout ?? 0,
        scatter: doc.scatter ?? false,
        scatterIndVar: doc.scatterIndVar || '',
        scatterDepVar: doc.scatterDepVar || '',
        dumbTextArea: doc.dumbTextArea || '',
        created: doc.created?.toString() || '0',
        hyperparameters: doc.hyperparameters ?? {},
        finished: doc.finished ?? false,
        estimatedTotalTimeMinutes: doc.estimatedTotalTimeMinutes ?? 0,
        expToRun: doc.expToRun ?? 0,
        file: doc.file || '',
        status: doc.status || 'OK',
        startedAtEpochMillis: doc.startedAtEpochMillis ?? 0,
        finishedAtEpochMilliseconds: doc.finishedAtEpochMilliseconds ?? 0,
        passes: doc.passes ?? 0,
        fails: doc.fails ?? 0,
        totalExperimentRuns: doc.totalExperimentRuns ?? 0,
    }));
}
