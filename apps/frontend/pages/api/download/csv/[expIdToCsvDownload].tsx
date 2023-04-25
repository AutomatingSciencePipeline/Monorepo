import clientPromise, { DB_NAME } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ResultsCsv } from '../../../../lib/mongodb_types';

// TODO possible to extract a common function/class here? very little varies between this and zip

const mongoCSVHandler: NextApiHandler<ResultsCsv> = async (req, res) => {
	const { expIdToCsvDownload } = req.query;
	if (typeof expIdToCsvDownload !== 'string') {
		res.status(400).json({ response: 'Missing experiment ID' } as any);
		return;
	}

	let results;
	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		results = await db
			.collection('results')
			// TODO correct mongodb typescript type for id
			.find({ '_id': expIdToCsvDownload as any }).toArray();
	} catch (error) {
		const message = 'Failed to download the csv';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
	console.log('found results: ', results);
	if (results.length !== 1) {
		console.warn(`Experiment ${expIdToCsvDownload} CSV not found`);
		res.status(404).json({ response: 'Experiment CSV not found' } as any);
	} else {
		// TODO correct way to typescript handle this?
		res.json(results[0] as unknown as ResultsCsv);
	}
};

export default mongoCSVHandler;
