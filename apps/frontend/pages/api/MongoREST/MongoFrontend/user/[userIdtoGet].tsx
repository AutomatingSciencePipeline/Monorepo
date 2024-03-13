import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ExperimentData } from '../../../../../MongoDB/mongodb_types';


const userExperimentsHandler: NextApiHandler<ExperimentData[]> = async (req, res) => {
	// Extract userId from the query parameters
	const { userIdtoGet } = req.query;

	if (!userIdtoGet || typeof userIdtoGet !== 'string') {
		res.status(400).json({ error: 'userId is this from userExperimentsHandler' });
		return;
	}

	try {
		const client = await clientPromise;
		const db = client.db(DB_NAME);
		console.log('in userExperimentsHandler');

		// Query the database for experiments associated with the userId
		const experiments = await db
			.collection('Experiments')
			.find({ 'experiment.creator': userIdtoGet }) // Assuming 'creator' field holds the userId
			.toArray();

		console.log('experiments length', experiments.length);

		// Respond with the fetched experiments
		res.status(200).json(experiments);
	} catch (error) {
		console.error('Error contacting MongoDB:', error);
		res.status(500).json({ error: 'Failed to fetch experiments from MongoDB' } as ExperimentData[]);
	}
};

export default userExperimentsHandler;
