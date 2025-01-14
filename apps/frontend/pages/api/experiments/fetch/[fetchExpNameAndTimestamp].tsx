import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ExperimentData } from '../../../../lib/db_types';

const mongoExpHandler: NextApiHandler<ExperimentData> = async (req, res) => {
    const { expIdToGetNameAndTimestamp } = req.query;
    if (typeof expIdToGetNameAndTimestamp !== 'string') {
        res.status(400).json({ response: 'Missing experiment ID' } as any);
        return;
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const experiment = await db
            .collection(COLLECTION_EXPERIMENTS)
            .findOne({'_id': expIdToGetNameAndTimestamp as any});

        if (!experiment) {
            return res.status(404).json({ response: 'Experiment not found' } as any);
        }

        // TODO: Create a new field for experiments called timeStarted IF created is not what I expect
        res.status(200).json({name: experiment.name, created: experiment.created} as any);
    } catch (error) {
        const message = 'Failed to fetch experiment details';
        console.error('Error contacting server: ', error);
        res.status(500).json({ response: message } as any);
    }
};

export default mongoExpHandler;
