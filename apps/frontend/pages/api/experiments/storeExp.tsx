import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ExperimentData } from '../../../lib/db_types';

const mongoExpHandler: NextApiHandler = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ response: 'Method not allowed, use POST' } as any);
        return;
    }

    const experimentData: Partial<ExperimentData> = JSON.parse(req.body);

    if (!experimentData || typeof experimentData !== 'object') {
        res.status(400).json({ response: 'Invalid experiment data provided' } as any);
        return;
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // Insert the new experiment data
        const result = await db
            .collection(COLLECTION_EXPERIMENTS)
            .insertOne(experimentData);

        if (result.insertedId) {
            res.status(201).json({ response: 'Experiment data stored successfully', id: result.insertedId });
        } else {
            throw new Error('Insert operation failed');
        }
    } catch (error) {
        const message = 'Failed to store the experiment data';
        console.error('Error contacting server: ', error);
        res.status(500).json({ response: message } as any);
    }
};

export default mongoExpHandler;
