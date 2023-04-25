import { NextApiHandler } from 'next';
import { getEnvVar } from '../../utils/env';


const BACKEND_PORT = getEnvVar('BACKEND_PORT');
const CONTACT_BACKEND_AT = getEnvVar('CONTACT_BACKEND_AT');

export interface QueueResponse {
	response: {
		queueSize: number;
	}
}

const handler: NextApiHandler<QueueResponse> = async (req, res) => {
	try {
		const queueResponse = await fetch(`http://${CONTACT_BACKEND_AT}:${BACKEND_PORT}/queue`);
		if (queueResponse?.ok) {
			const contents = await queueResponse.json();
			console.log('Queue Size', contents);
			res.status(queueResponse.status).json({ response: contents });
		} else {
			throw new Error(`Fetch failed: ${queueResponse.status}`);
		}
	} catch (error) {
		const message = 'Could not reach the server to determine the queue length';
		console.warn('Error contacting server: ', error);
		// This cast is tolerable because it's error code 500 so already being handled by error code at this point
		res.status(500).json({ response: message } as unknown as QueueResponse);
	}
};

export default handler;
