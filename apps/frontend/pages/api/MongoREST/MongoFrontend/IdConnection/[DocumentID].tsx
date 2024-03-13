import clientPromise, {DB_NAME} from "../../../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";

const subscribeToExpMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Not a GET method. Not Allowed.'});
	}
	// Set up SSE headers
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');

	const expIDtoConnect = req.query.expIDtoConnect;

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);
		const collection = db.collection('Experiments');

		const initData = await db.collection('Experiments').find({ '_id': expIDtoConnect as any }).toArray();
		const changeStream = collection.watch([{ $match: { '_id': expIDtoConnect as any } }]);
		res.status(200).json(initData);

		changeStream.on('change', async (change) => {
			const updatedData = await db.collection('Experiments').find({ '_id': expIDtoConnect as any }).toArray();
			res.status(200).json({ change, updatedData });
		});

		// Handle client disconnect
		req.on('close', () => {
			changeStream.close();
			res.end();
		});
	} catch (error) {
		res.status(500).json({ message: 'Error setting up subscription', error: error.message });
	}
};

export default subscribeToExpMongo;
