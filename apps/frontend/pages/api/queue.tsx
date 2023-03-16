// TODO the frontend should not have to directly communicate with the backend servers for this,
//  it should just put stuff into database -> it's backend's job to look for new tasks to run

async function process(url: string, id, key, res) {
	const response = await fetch(url);
	if (!response.ok) {
		console.error(`Error while handling upload for id ${id}: `, response);
	}
	const contents = await response.json();
	console.log(contents);
	res.status(response.status).json({ response: contents });
}

// TODO code duplication with the experiment upload route

const handler = async (req, res) => {
	const { id } = req.query;
	const { key } = req.body;

	try {
		await process('http://glados-backend:5050/queue', id, key, res);
	} catch (error) {
		console.log('Error contacting to docker server: ', error);
		console.warn('Could not send to the Docker url, trying localhost...');
		try {
			await process('http://localhost:5050/queue', id, key, res);
		} catch (error) {
			const message = 'Could not reach the docker container nor localhost';
			console.log('Error contacting to localhost server: ', error);
			res.status(500).json({ response: message });
			throw new Error(message);
		}
	}
};

export default handler;
