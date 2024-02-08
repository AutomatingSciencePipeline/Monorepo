import clientPromise, {DB_NAME} from '../../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

const getExperimentMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Not a PUT method. Not Allowed.'});
	}

	// const { expIDtoGet } = req.query;
	const expIDtoGet = req.query.expIdtoGet;
	console.log(`This is from the req ${req.query.expIdtoGet}`);
	console.log(`The id of item to get is: ${expIDtoGet}`);

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);
		const results = await db
			.collection('Experiments')
			.find({ '_id': expIDtoGet as any }).toArray();
		console.log(`This is the result: ${Object.keys(results)}`);
		console.log(`The length of an item is: ${results.length}`);
		res.status(200).json(results);
	} catch (error) {
		const message = 'Failed to Retrieve information';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
};

export default getExperimentMongo;
