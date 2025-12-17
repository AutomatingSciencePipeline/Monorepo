import { GridFSBucket, ObjectId } from 'mongodb';
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { tokenBasedAuth } from '../../../../tokenAuth';

export async function POST(req: NextRequest) {
    const experiment_req = await req.json();

    if (!experiment_req || !experiment_req ["token"] || !experiment_req["expID"]){
        return new Response('Other', { status: 400 });
    }
    
    const user = await tokenBasedAuth(experiment_req ["token"]);
    const userData = await user.json();
    const uid = userData["_id"];

    const expID = experiment_req["expID"];

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const experiment = await db
            .collection(COLLECTION_EXPERIMENTS )
            .findOne({ _id: new ObjectId(expID) });

        if (!experiment) {
            return NextResponse.json(
                {
                    response: `not_found`,
                },
                { status: 404 }
            );
        }

        if (
            uid !== experiment.creator &&
            !experiment.sharedUsers?.includes(uid)
        ) {
            return NextResponse.json(
                {
                    response: `not_found`,
                },
                { status: 403 }
            );
        }

        const logsBucket = new GridFSBucket(db, { bucketName: 'logsBucket' });

        const results = await logsBucket
            .find({ 'metadata.experimentId': expID })
            .toArray();

        if (results.length !== 1) {
            return NextResponse.json(
                {
                    response: `not_found`,
                },
                { status: 404 }
            );
        }

        const downloadStream = logsBucket.openDownloadStream(results[0]._id);
        const chunks: Buffer[] = [];

        const contents = await new Promise<string>((resolve, reject) => {
            downloadStream.on('data', (chunk) => chunks.push(chunk));
            downloadStream.on('end', () => {
                resolve(Buffer.concat(chunks as unknown as Uint8Array[]).toString('utf-8'));
            });
            downloadStream.on('error', (err) => reject(err));
        });

        if (contents.length === 0) {
            return new NextResponse(`Experiment Log '${expID}' was empty.`, { status: 200 });
        }

        return new NextResponse(contents, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('Error contacting server: ', error);
        return NextResponse.json({ response: 'not_found' }, { status: 500 });
    }
}
