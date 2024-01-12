import clientPromise, {DB_NAME} from '../../../lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { ExperimentData } from '../../../MongoDB/mongodb_types';
import { NextApiRequest, NextApiResponse } from 'next';

const submitBinaryData = async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Not a POST method. Not Allowed.'});
	}

	try {
		const expId = req.body.expId;
        const file = req.body.file;

		const client = await clientPromise;
		const db = client.db(DB_NAME);
		const gridBucket = new GridFSBucket(db, { bucketName: expId});

		const uploadingStream = gridBucket.openUploadStream(file);
		uploadingStream.write(file);
		uploadingStream.end();

		uploadingStream.on('finish', () => {
			res.status(200).json({ message: 'File uploaded successfully' });
		});
	} catch (error) {
		console.error('Error:', error);
		res.status(500).json({ message: 'Error uploading file' });
	}
};

export default submitBinaryData;
