import clientPromise, { COLLECTION_ZIPS, DB_NAME } from '../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ProjectZip } from '../../../../lib/mongodb_types';
import { GridFSBucket } from 'mongodb';

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
		const zipsBucket = new GridFSBucket(db, { bucketName: 'zipsBucket' });

		// First check that the file exists
		results = await zipsBucket.find({ 'metadata.experimentId': expIdToZipDownload }).toArray();

		if (results.length === 0) {
			console.warn(`Experiment ${expIdToZipDownload} ZIP not found`);
			res.status(404).json({ response: 'Experiment ZIP not found' } as any);
			return;
		}

		// Download the file
		const downloadStream = zipsBucket.openDownloadStream(results[0]._id);
		// This has to return the zip contents
		const chunks: Buffer[] = [];
		downloadStream.on('data', (chunk) => {
			chunks.push(chunk);
		});

		downloadStream.on('end', () => {
			//Zip contents are b64 encoded and stored in binary format
			//So we need to concatenate the chunks and return them as a buffer
			const zipContents = Buffer.concat(chunks as unknown as Uint8Array[]);
			//Make sure this is returned as a string
			const zipContentsString = zipContents.toString('base64');
			var result = { fileContent: zipContentsString };
			res.json(result as unknown as ProjectZip);
		});

	} catch (error) {
		const message = 'Failed to download the zip';
		console.error('Error contacting server: ', error);
		res.status(500).json({ response: message } as any);
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
