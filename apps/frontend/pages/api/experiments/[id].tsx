// TODO the frontend should not have to directly communicate with the backend servers for this,
//  it should just put stuff into database -> it's backend's job to look for new tasks to run

async function sendViaUrl(url: string, id, key, res) {
	const response = await fetch(url, {
		method: 'POST',
		headers: new Headers({
			'Content-Type': 'application/json',
		}),
		// credentials:
		body: JSON.stringify({ experiment: { id, key } }),
	});
	if (!response.ok) {
		console.error(`Error while handling upload for id ${id}: `, response);
	}
	res.status(response.status).json({ response: response });
}

const handler = async (req, res) => {
	const { id } = req.query;
	const { key } = req.body;
	console.log('Key from request body is', key);

	// TODO improve this to select URL from env vars or similar instead of trying both
	// also, if frontend is inside a container and backend isn't, this will still fail because frontend's localhost isn't the host machine
	try {
		await sendViaUrl('http://glados-backend:5050/experiment', id, key, res);
	} catch (error) {
		console.log('Error uploading experiment to docker server: ', error);
		console.warn('Could not send to the Docker url, trying localhost...');
		try {
			await sendViaUrl('http://localhost:5050/experiment', id, key, res);
		} catch (error) {
			const message = 'Could not reach the docker container nor localhost to upload the experiment';
			console.log('Error uploading experiment to localhost server: ', error);
			res.status(500).json({ response: message });
			throw new Error(message);
		}
	}
};

export default handler;
