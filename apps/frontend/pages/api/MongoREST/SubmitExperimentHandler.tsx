import clientPromise, {DB_NAME} from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { ExperimentData } from '../../../MongoDB/mongodb_types';
import { NextApiRequest, NextApiResponse } from 'next';

const submitExperimentMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Not a POST method. Not Allowed.'});
	}

	try {
		// Retrieve information to store.
		const experimentInformation = req.body;
		const client = await clientPromise;
		const db = client.db(DB_NAME);
		const result = await db.collection('Experiments').insertOne(experimentInformation);

		// The ID of the item inserted
		const experimentID = result.insertedId;

		res.status(200).json({ message: 'Data inserted successfully', experimentID });
	} catch (error) {
		res.status(500).json({ message: 'Error inserting data', error: error.message });
	}
};

export default submitExperimentMongo;
