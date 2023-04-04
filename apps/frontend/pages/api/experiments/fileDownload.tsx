import clientPromise from '../../../lib/mongodb';

const mongoCSVHandler = async (req, res) => {
	try {
		const { id } = req.query;
		const { key } = req.body;
		console.log('Key from request body is', key);

		const client = await clientPromise;
		const db = client.db("gladosdb");

		const resultCSV = await db
			.collection('results')
			.find({'_id': key});
		res.json(resultCSV);
	} catch (e) {
		console.error(e);
	}
};

export default mongoCSVHandler;
