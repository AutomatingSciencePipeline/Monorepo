import clientPromise, {DB_NAME} from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

const deleteExperimentMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	if (req.method !== 'DELETE') {
		return res.status(405).json({ message: 'Not a DELETE method. Not Allowed.'});
	}

	const { expIdToDelete } = req.query;
	console.log('Check this out', req.query);
	let result;
	try {
		// Retrieve information to store.
		// const { content } = req.body;
		console.log(`The expid to delete is: ${expIdToDelete}`);
		const client = await clientPromise;
		const db = client.db(DB_NAME);
		const expString = expIdToDelete as any;
		const expObjectId = new ObjectId(expString);
		result = await db.collection('Experiments')
			.deleteOne({ '_id': expObjectId });

		if (result.deletedCount === 1) {
			console.log('Item deleted successfully.');
		} else {
			console.log('Item not found or deletion unsuccessful.');
		}

		res.status(200).json({ message: 'Data deleted successfully', result});
	} catch (error) {
		res.status(500).json({ message: 'Error deleting data', error: error.message });
	}
};

export default deleteExperimentMongo;
