import { NextApiHandler } from 'next';
import { getEnvVar } from '../../../utils/env';

const BACKEND_PORT = getEnvVar('BACKEND_PORT');
const CONTACT_BACKEND_AT = getEnvVar('CONTACT_BACKEND_AT');

// TODO the frontend should not have to directly communicate with the backend servers for this,
//  it should just put stuff into database -> it's backend's job to look for new tasks to run

const experimentHandler: NextApiHandler = async (req, res) => {
	const { expIdToStart } = req.query;
	const { key } = req.body;
	console.log(`expIdToStart: ${expIdToStart}`);
	console.log(`key: ${key}`);

	try {
		const url = `http://${CONTACT_BACKEND_AT}:${BACKEND_PORT}/experiment`;
		let data = {
			headers: new Headers({
				'Content-Type': 'application/json',
			}),
			// credentials:
			body: JSON.stringify({ experiment: { id: expIdToStart, key } }),
		};
		data['method'] = req.method;
		console.log(`data: ${data}`);
		const backendResponse = await fetch(url, data);
		if (backendResponse?.ok) {
			res.status(backendResponse.status).json({ response: backendResponse });
		} else {
			throw new Error(`fetch failed: ${backendResponse.status}`);
		}
	} catch (error) {
		const message = 'Could not reach the server';
		console.log('Error contacting server: ', error);
		res.status(500).json({ response: message });
		throw new Error(message);
	}
};

export default experimentHandler;
