import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { WithId, Document } from 'mongodb';
import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { tokenBasedAuth } from '../../../../tokenAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const experiment_req = await req.json();

    if (!experiment_req || !experiment_req ["token"] || !experiment_req ["exp_title"] ){
        return new Response('Other', { status: 400 });
    }

     const user = await tokenBasedAuth(experiment_req ["token"]);
     const userData = await user.json();
        if(userData["response"]){
            let processedResult = {
                "success": false,
                "error": "Other",
                "matches": undefined
            }
            return NextResponse.json(processedResult);
        }
    const uid = userData["_id"];
    if (!uid){
        let processedResult = {
            "success": false,
            "error": "auth_error",
            "matches": undefined
        }
        return NextResponse.json(processedResult);
    }
    const title = experiment_req ["exp_title"];
    
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    const sendAllRelevantDocs = async () => {
                const docs = await experimentsCollection
                    .find({ $and: [ {$or: [{ creator: uid }, { sharedUsers: { $in: [uid] } }]}, {name: title}]})
                    .toArray();
                const array = convertToExpsArray(docs);
                return array;
    };

    let processedResult;
    try{
        const result = await sendAllRelevantDocs();
        processedResult = {
            "success": true,
            "error": undefined,
            "matches": result.sort((a, b) => b.startedAtEpochMillis - a.startedAtEpochMillis)
        }
    } catch (error){
        processedResult = {
            "success": false,
            "error": "Other",
            "matches": undefined
        }
    }

    return NextResponse.json(processedResult);
}


function convertToExpsArray(arr: WithId<Document>[]) {
    return arr.map((doc: WithId<Document>) => ({
        id: doc._id.toString(),
        name: doc.name || 'Untitled',
        status: doc.status || 'OK',
        started_on: doc.startedAtEpochMillis ?? 0,
    }));
}



