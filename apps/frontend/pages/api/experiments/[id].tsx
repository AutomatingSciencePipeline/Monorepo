import { NextApiHandler } from 'next';
import { getEnvVar } from '../../../utils/env';

const BACKEND_PORT = getEnvVar('BACKEND_PORT');
const CONTACT_BACKEND_AT = getEnvVar('CONTACT_BACKEND_AT');

// TODO the frontend should not have to directly communicate with the backend servers for this,
//  it should just put stuff into database -> it's backend's job to look for new tasks to run

const handler: NextApiHandler = async (req, res) => {
	const { id } = req.query;
	const { key } = req.body;

	try {
		const url = `http://${CONTACT_BACKEND_AT}:${BACKEND_PORT}/experiment`;
		const backendResponse = await fetch(url, {
			method: 'POST',
			headers: new Headers({
				'Content-Type': 'application/json',
			}),
			// credentials:
			body: JSON.stringify({ experiment: { id, key } }),
		});
		if (backendResponse?.ok) {
			res.status(backendResponse.status).json({ response: backendResponse });
		} else {
			throw new Error(`Fetch failed: ${backendResponse.status}`);
		}
	} catch (error) {
		const message = 'Could not reach the server to request start of the experiment';
		console.log('Error contacting server: ', error);
		res.status(500).json({ response: message });
		throw new Error(message);
	}
};

export default handler;
