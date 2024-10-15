import clientPromise, { DB_NAME, COLLECTION_RESULTS_CSVS, COLLECTION_EXPERIMENT_FILES } from '../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

const mongoFileUploader: NextApiHandler<string> = async (req, res) => {
    if (req.method === 'POST') {
        const { fileToUpload, experimentId } = req.body;

        if (!fileToUpload || !experimentId) {
            return res.status(400).json({ response: "Not enough arguments!" } as any);
        }

        if (typeof fileToUpload !== 'string') {
            res.status(400).json({ response: 'File is not in the correct format' } as any);
            return;
        }

        try {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

            const readableStream = new Readable();
            readableStream.push(fileToUpload);
            readableStream.push(null);

            readableStream.
                pipe(bucket.openUploadStream(`experimentFile${experimentId}`, {
                    chunkSizeBytes: 1048576,
                    metadata: { field: 'expId', value: experimentId }
                }) as any);
                

            res.status(200).json({ response: 'Successfully wrote file!' } as any);
            return;
        }
        catch (error) {
            const message = "Failed to upload experiment file!";
            console.error("Error writing experiment file.");
            res.status(500).json({ response: message } as any);
        }
    }
}


export default mongoFileUploader;
