
import { ObjectId } from 'mongodb';
import clientPromise, {DB_NAME} from '../../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

const getExperimentMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	const { expIdtoGet } = req.query;
	// const expIDtoGet = req.query.expIdtoGet;
	// console.log(`This is from the req ${req.query.expIdtoGet}`);
	console.log(`The id of item to get is: ${expIdtoGet}`);

	let result;
	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);
		const expString = expIdtoGet as any;
		const expObjectId = new ObjectId(expString);
		result = await db.collection('Experiments')
			.find({ '_id': expObjectId }).toArray();
		console.log(`This is the result: `, result);
		console.log(`The length of an item is: ${result.length}`);
		res.status(200).json(result[0]);
	} catch (error) {
		const message = 'Failed to Retrieve information';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
};

export default getExperimentMongo;
