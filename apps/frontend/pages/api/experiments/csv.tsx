import { MongoClient } from 'mongodb';

const mongoCSVHandler = async (req, res) => {
	try {
		const key = req.body;
		console.log('Key from request body is', key);

		const uri = process.env.MONGODB_URI;
		let clientPromise : Promise<MongoClient> = new Promise((success) => {
			return true;
		});
		clientPromise = new MongoClient('mongodb://glados-mongodb:27017', {}).connect();
		const client = await clientPromise;
		const db = client.db("gladosdb");

		const resultCSV = await db
			.collection('results')
			.find({'_id': key}).toArray();
		console.log('found results: ');
		res.json(resultCSV);
	} catch (e) {
		console.error(e);
	}
};

export default mongoCSVHandler;
