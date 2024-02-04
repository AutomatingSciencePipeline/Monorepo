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
	// const uploadDir = path.join(process.cwd(), '.', 'TempFiles');
	try {
		// if (!fs.existsSync(uploadDir)) {
		// 	fs.mkdirSync(uploadDir, { recursive: true });
		// }
		[fields, files] = await form.parse(req);
		console.log("This is fields", fields['id'][0]);
		const oldPath = files.file[0].filepath;
		// const newPath = path.join(uploadDir, fileName);
		// console.log("the new path is: ", newPath);
		// fs.readdir('../TempFiles', (err, files) => {
		// 	if (err) {
		// 	  console.error('Error reading directory:', err);
		// 	  return;
		// 	}
		// 	console.log('Contents of the directory:');
		// 	files.forEach((file) => {
		// 	  console.log(file);
		// 	});
		//   });

		try {
			const data = fs.readFileSync(oldPath);
			const formData = new FormData();
			const blobData = new Blob([data]);
			const expID = fields['id'][0];
			formData.append('file', blobData);
			formData.append('expId', expID);
			console.log("This is a formdata ", formData);
			const url = `http://${CONTACT_BACKEND_AT}:${BACKEND_PORT}/backendExp`;
			const saveResponse = await fetch(url, {
				method: 'POST',
				// headers: new Headers({
				// 	'Content-Type': 'application/json',
				// }),
				body: formData,
			});
			if (saveResponse?.ok) {
				// res.status(saveResponse.status).json({ response: saveResponse });
				console.log("Posting successful");
			} else {
				throw new Error(`Fetch save file failed: ${saveResponse.status}`);
			}
			res.status(200).json({ message: 'File uploaded successfully.' });
		} catch (error) {
			res.status(500).json({ error: 'Error saving file.' });
		}
	} catch (err) {
		// example to check for a very specific error
		if (err.code === formidableErrors.maxFieldsExceeded) {

		}
		console.error(err);
		res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
		res.end(String(err));
		return;
	}
};

export default saveToBackend;
