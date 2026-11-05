import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authenticateCli, invalidArguments, isNonEmptyString, isObjectId, readJsonObject } from '../request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const experiment_req = await readJsonObject(req);

    if (!experiment_req || !isNonEmptyString(experiment_req.token) || !isObjectId(experiment_req.eid)) {
        return invalidArguments();
    }

    const auth = await authenticateCli(experiment_req.token);
    if (!auth.user) return auth.response;
    const uid = auth.user._id;

    try {
        const client = await clientPromise;
        const experimentsCollection = client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS);
        const result = await experimentsCollection.findOne({
            $and: [
                { $or: [{ creator: uid }, { sharedUsers: { $in: [uid] } }] },
                { _id: new ObjectId(experiment_req.eid) },
            ],
        });

        return NextResponse.json(result ? {
            success: true,
            status: result.status,
            current_permutation: (result.passes || 0) + (result.fails || 0),
            total_permutations: result.totalExperimentRuns,
        } : { success: false, error: 'not_found' });
    } catch {
        return NextResponse.json({ success: false, error: 'Other' }, { status: 500 });
    }
}

