import formidable, {errors as formidableErrors} from 'formidable';
import { getEnvVar } from '../../../utils/env';
import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';

const BACKEND_PORT = getEnvVar('BACKEND_PORT');
const CONTACT_BACKEND_AT = getEnvVar('CONTACT_BACKEND_AT');

export const config = {
	api: {
		bodyParser: false,
	},
};

const saveToBackend = async (req, res) => {
	const form = formidable({});
	let fields;
	let files;
	try {
		[fields, files] = await form.parse(req);
		const oldPath = files.file[0].filepath;

		try {
			const data = fs.readFileSync(oldPath);
			const formData = new FormData();
			const blobData = new Blob([data]);
			const expID = fields['id'][0];
			formData.append('file', blobData);
			formData.append('expId', expID);
			const url = `http://${CONTACT_BACKEND_AT}:${BACKEND_PORT}/backendExp`;
			const saveResponse = await fetch(url, {
				method: 'POST',
				body: formData,
			});
			if (saveResponse?.ok) {
				console.log('Posting successful');
			} else {
				throw new Error(`Fetch save file failed: ${saveResponse.status}`);
			}
			res.status(200).json({ message: 'File uploaded successfully.' });
		} catch (error) {
			res.status(500).json({ error: 'Error saving file.' });
		}
	} catch (err) {
		// could be used when looking for a specific error.
		if (err.code === formidableErrors.maxFieldsExceeded) {

		}
		console.error(err);
		res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
		res.end(String(err));
		return;
	}
};

export default saveToBackend;
