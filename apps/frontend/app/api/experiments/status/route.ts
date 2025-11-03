// app/api/experiments/stream-by-uid/route.ts

import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { WithId, Document } from 'mongodb';
import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const experiment_req = await req.json();

    if (!experiment_req || !experiment_req ["uid"] || !experiment_req ["eid"] ){
        return new Response('Other', { status: 400 });
    }

    const uid = experiment_req ["uid"];
    const eid = experiment_req ["eid"];

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    const sendRelevantDoc = async () => {
                const doc = await experimentsCollection
                    .findOne({ $and: [ {$or: [{ creator: uid }, { sharedUsers: { $in: [uid] } }]}, {_id: new ObjectId(eid)}]})
                return doc
    };

    let processedResult;
    try{
        const result = await sendRelevantDoc();
        processedResult = result ? 
        {
            "success": true,
            "error": undefined,
            "status": result.status,
            "current_permutation": (result.passes ? result.passes : 0) + (result.fails ? result.fails : 0),
            "total_permutations": result.totalExperimentRuns
        } :
        {
            "success": false,
            "error": "not_found",
            "status": undefined,
            "current_permutation": undefined,
            "total_permutations": undefined
        }

    } catch (error){
        processedResult = {
            "success": false,
            "error": "Other",
            "status": undefined,
            "current_permutation": undefined,
            "total_permutations": undefined
        }
    }

    // return NextResponse.json(result);
    return NextResponse.json(processedResult);
}

