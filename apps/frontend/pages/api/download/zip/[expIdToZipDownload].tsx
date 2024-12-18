import clientPromise, { COLLECTION_ZIPS, DB_NAME } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ProjectZip } from '../../../../lib/mongodb_types';

// TODO possible to extract a common function/class here? very little varies between this and csv

const mongoZipHandler: NextApiHandler<ProjectZip> = async (req, res) => {
	const { expIdToZipDownload } = req.query;
	if (typeof expIdToZipDownload !== 'string') {
		res.status(400).json({ response: 'Missing experiment ID' } as any);
		return;
	}

	let results;
	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		results = await db
			.collection(COLLECTION_ZIPS)
			// TODO correct mongodb typescript type for id
			.find({ 'experimentId': expIdToZipDownload as any }).toArray();
	} catch (error) {
		const message = 'Failed to download the zip';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}
	if (results.length !== 1) {
		console.warn(`Experiment ${expIdToZipDownload} ZIP not found`);
		res.status(404).json({ response: 'Experiment ZIP not found' } as any);
	} else {
		// TODO correct way to typescript handle this?
		res.json(results[0] as unknown as ProjectZip);
	}
};

// Remove the file size limit on the response
// https://nextjs.org/docs/api-routes/request-helpers#custom-config
export const config = {
	api: {
		responseLimit: false,
	},
};

export default mongoZipHandler;
