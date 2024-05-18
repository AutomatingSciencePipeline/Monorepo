import { NextApiHandler } from 'next';
import { getEnvVar } from '../../utils/env';


const BACKEND_PORT = getEnvVar('BACKEND_PORT');

export interface QueueResponse {
	response: {
		queueSize: number;
	}
}

const handler: NextApiHandler<QueueResponse> = async (req, res) => {
	try {
		const queueResponse = await fetch(`http://glados-service-backend:${BACKEND_PORT}/queue`);
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
		res.status(500).json({ response: message } as any);
	}
};

export default handler;
