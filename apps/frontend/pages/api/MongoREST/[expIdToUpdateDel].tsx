import { object } from 'joi';
import clientPromise, { DB_NAME } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

const deleteExperimentMongo = async (req: NextApiRequest, res: NextApiResponse ) => {
	if (req.method === 'DELETE') {
		const { expIdToUpdateDel } = req.query;
		let result;
		try {
			const client = await clientPromise;
			const db = client.db(DB_NAME);

			// Id to search.
			const expString = expIdToUpdateDel as string;
			const expObjectId = new ObjectId(expString);
			result = await db.collection('Experiments')
				.deleteOne({ '_id': expObjectId });

			if (result.deletedCount === 1) {
				console.log('Item deleted successfully.');
				res.status(200).json({ message: 'Data deleted successfully', result });
			} else {
				console.log('Item not found or deletion unsuccessful.');
			}
		} catch (error) {
			res.status(500).json({ error: 'Error deleting file.' });
		}
	} else if (req.method === 'PUT') {
		const { expIdToUpdateDel } = req.query;
		const { content, valueToUpdate } = req.body;
		let result;
		try {
			// The value to update.
			const newValue = valueToUpdate as string;

			// The name of the field to update.
			const field = content as string;
			const objectField = `experiment.${field}`;

			const client = await clientPromise;
			const db = client.db(DB_NAME);

			// _id to search.
			const expString = expIdToUpdateDel as string;
			const expObjectId = new ObjectId(expString);

			// Searching and updating the field.
			result = await db.collection('Experiments').updateOne(
				{ '_id': expObjectId },
				{
					$set: {
						[objectField]: newValue,
					},
				}
			);
			if (result.modifiedCount > 0) {
				console.log('Update successful.');
				res.status(200).json({ message: 'Data updated successfully', result });
			} else {
				console.log('No documents matched the filter, or no documents were modified.');
			}
		} catch (error) {
			res.status(500).json({ error: 'Error updating file.' });
		}
	} else {
		return res.status(405).json({ message: 'Not a DELETE or UPDATE method. Not Allowed.' });
	}
};

export default deleteExperimentMongo;
