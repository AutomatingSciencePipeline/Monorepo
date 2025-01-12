import clientPromise, { DB_NAME, COLLECTION_RESULTS_CSVS } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ResultsCsv } from '../../../../lib/mongodb_types';
import { GridFSBucket } from 'mongodb';

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
		const resultsBucket = new GridFSBucket(db, { bucketName: 'resultsBucket' });
		//First check that the file exists
		results = await resultsBucket.find({ "metadata.experimentId": expIdToCsvDownload }).toArray();
		if (results.length === 0) {
			console.warn(`Experiment ${expIdToCsvDownload} CSV not found`);
			res.status(404).json({ response: 'Experiment CSV not found' } as any);
			return;
		}
		
		if (results.length !== 1) {
			console.warn(`Experiment ${expIdToCsvDownload} CSV not found`);
			res.status(404).json({ response: 'Experiment CSV not found' } as any);
		} else {
			//Download the file
			const downloadStream = resultsBucket.openDownloadStream(results[0]._id);
			//This has to return the csv contents
			const chunks: Buffer[] = [];
			downloadStream.on('data', (chunk) => {
				chunks.push(chunk);
			});

			downloadStream.on('end', () => {
				const csvContents = Buffer.concat(chunks as unknown as Uint8Array[]).toString('utf-8');
				var result = { resultContent: csvContents };
				res.json(result as unknown as ResultsCsv);
			});
		}

	} catch (error) {
		const message = 'Failed to download the csv';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}

};

export default mongoCSVHandler;
