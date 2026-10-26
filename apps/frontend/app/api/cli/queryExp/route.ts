import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { WithId, Document } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateCli, invalidArguments, isNonEmptyString, readJsonObject } from '../request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const experiment_req = await readJsonObject(req);

    if (!experiment_req || !isNonEmptyString(experiment_req.token) || !isNonEmptyString(experiment_req.exp_title)) {
        return invalidArguments();
    }

    const auth = await authenticateCli(experiment_req.token);
    if (!auth.user) return auth.response;
    const uid = auth.user._id;

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);
        const visibility = { $or: [{ creator: uid }, { sharedUsers: { $in: [uid] } }] };
        const filters = experiment_req.exp_title.trim() === '*'
            ? [visibility]
            : [visibility, { name: experiment_req.exp_title }];
        const docs = await experimentsCollection.find({ $and: filters }).toArray();
        const result = convertToExpsArray(docs);
        return NextResponse.json({
            success: true,
            matches: result.sort((a, b) => b.started_on - a.started_on),
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Other' }, { status: 500 });
    }
}


function convertToExpsArray(arr: WithId<Document>[]) {
    return arr.map((doc: WithId<Document>) => ({
        id: doc._id.toString(),
        name: doc.name || 'Untitled',
        tags: doc.tags || [],
        status: doc.status || 'OK',
        started_on: doc.startedAtEpochMillis ?? 0,
        current_permutation: (doc.passes ? doc.passes : 0) + (doc.fails ? doc.fails : 0),
        total_permutations: doc.totalExperimentRuns
    }));
}



