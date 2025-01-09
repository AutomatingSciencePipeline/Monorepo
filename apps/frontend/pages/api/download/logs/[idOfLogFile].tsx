import { GridFSBucket } from 'mongodb';
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
	const client = await clientPromise;
	const db = client.db(DB_NAME);
	const logsBucket = new GridFSBucket(db, { bucketName: 'logsBucket' });
	try {
		//First check that the file exists
		results = await logsBucket.find({ "metadata.experimentId": idOfLogFile }).toArray();
		if (results.length === 0) {
			console.warn(`Experiment ${idOfLogFile} Log not found`);
			res.status(404).json({ response: `Experiment Log '${idOfLogFile}' not found. Please contact the GLADOS team for further troubleshooting.` } as any);
			return;
		}

		if (results.length !== 1) {
			console.warn(`Experiment ${idOfLogFile} Log not found`);
			res.status(404).json({ response: `Experiment Log '${idOfLogFile}' not found. Please contact the GLADOS team for further troubleshooting.` } as any);
		} else {
			//Download the file
			const downloadStream = logsBucket.openDownloadStream(results[0]._id);
			//This has to return the csv contents
			const chunks: Buffer[] = [];
			downloadStream.on('data', (chunk) => {
				chunks.push(chunk);
			});

			downloadStream.on('end', () => {
				const contents = Buffer.concat(chunks as unknown as Uint8Array[]).toString('utf-8');
				if (contents.length === 0) {
					console.warn(`Experiment ${idOfLogFile} Log was empty`);
					res.send(`Experiment Log '${idOfLogFile}' was empty.`);
				}
				else {
					res.send(contents);
				}

			});
		}

	} catch (error) {
		const message = 'Failed to download the log file';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
	}

};

export default mongoLogHandler;
