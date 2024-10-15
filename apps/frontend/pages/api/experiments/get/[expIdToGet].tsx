import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ExperimentData } from '../../../../firebase/db_types';

const mongoExpHandler: NextApiHandler<ExperimentData> = async (req, res) => {
	const { expIdToGet } = req.query;
	if (typeof expIdToGet !== 'string') {
		res.status(400).json({ response: 'Missing experiment ID' } as any);
		return;
	}

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		const experiment = await db
            .collection(COLLECTION_EXPERIMENTS)
            .findOne({ '_id': expIdToGet as any }); // Assuming expId is the unique identifier in the collection

        if (!experiment) {
            return res.status(404).json({ response: 'Experiment not found' } as any);
        }

        res.status(200).json(experiment as unknown as ExperimentData);
	} catch (error) {
		const message = 'Failed to download the experiment data';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
};

export default mongoExpHandler;
