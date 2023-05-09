import clientPromise, { COLLECTION_LOGS, DB_NAME } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';

// TODO possible to extract a common function/class here? very little varies between this, csv, and zip

const mongoLogHandler: NextApiHandler<String> = async (req, res) => {
	const { idOfLogFile } = req.query;
	if (typeof idOfLogFile !== 'string') {
		res.status(400).json({ response: 'Missing experiment ID' } as any);
		return;
	}

	let results;
	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		results = await db
			.collection(COLLECTION_LOGS)
			// TODO correct mongodb typescript type for id
			.find({ '_id': idOfLogFile as any }).toArray();
	} catch (error) {
		const message = 'Failed to download the log file';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
	if (results.length !== 1) {
		console.warn(`Experiment ${idOfLogFile} Log not found`);
		res.status(404).json({ response: `Experiment Log '${idOfLogFile}' not found. Remember, the production database doesn't have the logs of experiments from dev!` } as any);
	} else {
		const result = results[0];
		const contents = `${result?.fileContent ?? 'The log file was empty, or an error occurred'}`;
		res.send(contents);
	}
};

export default mongoLogHandler;
