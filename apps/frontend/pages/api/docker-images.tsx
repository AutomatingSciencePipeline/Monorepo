import { NextApiHandler } from 'next';
import { getEnvVar } from '../../utils/env';

const BACKEND_PORT = getEnvVar('BACKEND_PORT');
const CONTACT_BACKEND_AT = getEnvVar('CONTACT_BACKEND_AT');

const getDockerImagesHandler: NextApiHandler = async (_, res) => {
	try {
		const url = `http://${CONTACT_BACKEND_AT}:${BACKEND_PORT}/get/docker-images`;
		const backendResponse = await fetch(url);

		if (backendResponse.ok) {
			const data = await backendResponse.json();
			res.status(backendResponse.status).json({ images: data });
		} else {
			throw new Error(`Fetch failed: ${backendResponse.status}`);
		}
	} catch (error) {
		const message = 'Could not reach the server to fetch Docker images';
		console.error('Error contacting server: ', error);
		res.status(500).json({ error: message });
	}
};

export default getDockerImagesHandler;
