// app/api/experiments/stream-by-uid/route.ts

import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { WithId, Document } from 'mongodb';
import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const user = await req.json();

    if (!user || !user["_id"] ) {
        return new Response('Missing UID', { status: 400 });
    }

    const uid = user["_id"];

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    const sendAllRelevantDocs = async () => {
                const docs = await experimentsCollection
                    .find({ $or: [{ creator: uid }, { sharedUsers: { $in: [uid] } }] })
                    .toArray();
                const array = convertToExpsArray(docs);
                return array;
    };

    const result = await sendAllRelevantDocs();

    return NextResponse.json(result);
}

function convertToExpsArray(arr: WithId<Document>[]) {
    return arr.map((doc: WithId<Document>) => ({
        id: doc._id.toString(),
        name: doc.name || 'Untitled',
        creator: doc.creator || 'Unknown',
        description: doc.description || 'No description',
        workers: doc.workers ?? 0,
        expId: doc._id || '',
        trialExtraFile: doc.trialExtraFile || '',
        trialResult: doc.trialResult || '',
        trialResultLineNumber: doc.trialResultLineNumber ?? 0,
        timeout: doc.timeout ?? 0,
        keepLogs: doc.keepLogs ?? false,
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

