import clientPromise, {DB_NAME} from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { ExperimentData } from '../../../MongoDB/mongodb_types';
import { NextApiRequest, NextApiResponse } from 'next';

const updateExperimentMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	if (req.method !== 'PUT') {
		return res.status(405).json({ message: 'Not a PUT method. Not Allowed.'});
	}

	const { expIDtoUpdate } = req.query;

	try {
		// Retrieve information to store.
		const { content } = req.body;
		const client = await clientPromise;
		console.log(`The accessID is: ${expIDtoUpdate}`);
		const contentString = String(content);
		console.log(`The contentString is: ${contentString}`);
		const db = client.db(DB_NAME);

		// eslint-disable-next-line prefer-const
		const found = await db.collection('Experiments').find(
			{ '_id': expIDtoUpdate as any }
		);

		if (found) {
			console.log(`The ID of the found object is: ${JSON.stringify(found)}`);
		} else {
			console.log('Item not found');
		}
		const result = await db.collection('Experiments').updateOne(
			{ '_id': expIDtoUpdate as any },
			{
				$set: { 'experiment.$.expId': expIDtoUpdate },
			},
			// function (err, result) {
			// 	if (err) throw err;
			// 	console.log(result);
			//  }
		);

		res.status(200).json({ message: 'Data updated successfully', result});
	} catch (error) {
		res.status(500).json({ message: 'Error updating data', error: error.message });
	}
};

export default updateExperimentMongo;
