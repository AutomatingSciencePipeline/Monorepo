import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ExperimentData } from '../../../../firebase/db_types';
import { ObjectId } from 'mongodb';

const mongoExpHandler: NextApiHandler<ExperimentData> = async (req, res) => {
	const { expIdToDelete } = req.query;
	if (typeof expIdToDelete !== 'string') {
		res.status(400).json({ response: 'Missing experiment ID' } as any);
		return;
	}

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		const result = await db
            .collection(COLLECTION_EXPERIMENTS)
            .deleteOne({ '_id': new ObjectId(expIdToDelete) }); // Assuming expId is the unique identifier in the collection

        if (result.deletedCount == 0) {
            return res.status(404).json({ response: 'Experiment not found' } as any);
        }

        res.status(200);
	} catch (error) {
		const message = 'Failed to delete the experiment';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
};

export default mongoExpHandler;
