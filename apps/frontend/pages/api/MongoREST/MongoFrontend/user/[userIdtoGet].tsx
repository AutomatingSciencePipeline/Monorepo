import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ErrorResponse, ExperimentData } from '../../../../../MongoDB/mongodb_types';


const userExperimentsHandler: NextApiHandler<ExperimentData[]> = async (req, res) => {
	// Extract userId from the query parameters
	const { userIdtoGet } = req.query;

	if (!userIdtoGet || typeof userIdtoGet !== 'string') {
		console.error('Error contacting MongoDB:', Error);
		return;
	}

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);

		// Query the database for experiments associated with the userId
		const experiments = await db
			.collection('Experiments')
			.find({ 'experiment.creator': userIdtoGet }) // Assuming 'creator' field holds the userId
			.toArray();

		// Respond with the fetched experiments
		res.status(200).json(experiments as any);
	} catch (error) {
		console.error('Error contacting MongoDB:', error);
		res.status(500).json({ error: 'Failed to fetch experiments from MongoDB' } as any);
	}
};

export default userExperimentsHandler;
