import { NextApiHandler } from 'next';
import { CheckResult } from '../../../lib/mongodb_types';
import clientPromise, { COLLECTION_FILE_BUCKET, DB_NAME } from '../../../lib/mongodb';

// TODO the frontend should not have to directly communicate with the backend servers for this,
//  it should just put stuff into database -> it's backend's job to look for new tasks to run

const checkExperimentHandler: NextApiHandler<CheckResult> = async (req, res) => {
    const { expIdToCheck } = req.query;
    if (typeof expIdToCheck !== 'string') {
        res.status(400).json({ response: 'Missing experiment ID' } as any);
        return;
    }

    let results;
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        results = await db
            .collection(COLLECTION_FILE_BUCKET)
            .find({ 'metadata.expId': expIdToCheck as string })
            .toArray();
        
        console.log(results);
    } catch (error) {
        const message = 'Failed to download the csv';
        console.error('Error contacting server: ', error);
        res.status(500).json({ response: message } as any);
    }
    if (results.length > 0) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
};

export default checkExperimentHandler;
