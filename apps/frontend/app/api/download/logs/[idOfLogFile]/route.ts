import { GridFSBucket, ObjectId } from 'mongodb';
import clientPromise, { DB_NAME } from '../../../../../lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ idOfLogFile: string }> }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ response: 'Unauthorized' }, { status: 401 });
    }

    const { idOfLogFile } = await params;

    if (!idOfLogFile || typeof idOfLogFile !== 'string') {
        return NextResponse.json({ response: 'Missing experiment ID' }, { status: 400 });
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const experiment = await db
            .collection('experiments')
            .findOne({ _id: new ObjectId(idOfLogFile) });

        if (!experiment) {
            return NextResponse.json(
                {
                    response: `Experiment '${idOfLogFile}' not found. Please contact the GLADOS team for further troubleshooting.`,
                },
                { status: 404 }
            );
        }

        if (
            session.user?.id !== experiment.creator &&
            !experiment.sharedUsers?.includes(session.user?.id)
        ) {
            return NextResponse.json(
                {
                    response: `You are not authorized to access this experiment. Please contact the GLADOS team for further troubleshooting.`,
                },
                { status: 403 }
            );
        }

        const logsBucket = new GridFSBucket(db, { bucketName: 'logsBucket' });

        const results = await logsBucket
            .find({ 'metadata.experimentId': idOfLogFile })
            .toArray();

        if (results.length !== 1) {
            return NextResponse.json(
                {
                    response: `Experiment Log '${idOfLogFile}' not found. Please contact the GLADOS team for further troubleshooting.`,
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
            return new NextResponse(`Experiment Log '${idOfLogFile}' was empty.`, { status: 200 });
        }

        return new NextResponse(contents, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('Error contacting server: ', error);
        return NextResponse.json({ response: 'Failed to download the log file' }, { status: 500 });
    }
}
