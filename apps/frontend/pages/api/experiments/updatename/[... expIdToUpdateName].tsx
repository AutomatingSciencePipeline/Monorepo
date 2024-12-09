import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ExperimentData } from '../../../../lib/db_types';

const mongoExpHandler: NextApiHandler<ExperimentData> = async (req, res) => {
	const { expIdToUpdateName } = req.query;
	if (!(Array.isArray(expIdToUpdateName)) || expIdToUpdateName?.length == 0) {
		res.status(400).json({ response: 'Missing experiment ID' } as any);
		return;
	}

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		const expId = expIdToUpdateName[0]
		const newName = expIdToUpdateName[1]

		const experiment = await db
			.collection(COLLECTION_EXPERIMENTS)
			.updateOne({'_id': expId as any}, {'name': newName as any});

        if (!experiment) {
            return res.status(404).json({ response: 'Experiment not found' } as any);
        }

        res.status(200).json(experiment as unknown as ExperimentData);
	} catch (error) {
		const message = 'Failed to rename the experiment';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
};

export default mongoExpHandler;
