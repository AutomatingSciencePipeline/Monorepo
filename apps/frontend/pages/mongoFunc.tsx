import { ObjectId } from 'mongodb';
import { ExperimentData } from '../firebase/db_types';

export const submitMongoExperiment = async (values: Partial<ExperimentData>, userId: String): Promise<String> => {
	const apiUrl = '/api/MongoREST/SubmitExperimentHandler';

	const experiment = {
		creator: userId,
		name: values.name,
		description: values.description,
		verbose: values.verbose,
		workers: values.workers,
		// Change this with MongoDB ID
		expId: '',
		trialExtraFile: values.trialExtraFile,
		trialResult: values.trialResult,
		timeout: values.timeout,
		keepLogs: values.keepLogs,
		scatter: values.scatter,
		scatterIndVar: values.scatterIndVar,
		scatterDepVar: values.scatterDepVar,
		dumbTextArea: values.dumbTextArea,
		created: Date.now(),
		hyperparameters: JSON.stringify({
			hyperparameters: values.hyperparameters,
		}),
		finished: false,
		estimatedTotalTimeMinutes: 0,
		totalExperimentRuns: 0,
	};

	const result = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ experiment }),
	});

	if (result.ok) {
		const responseData = await result.json();
		console.log('Response:', responseData);
		experiment.expId = await responseData;
	} else {
		throw new Error('Request failed');
	}

	return experiment.expId;
};

export const updateMongoDoc = async ( expId: String) => {
	const updateUrl = `/api/MongoREST/${expId}`;
	const updateResult = await fetch(updateUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			'content': 'expId',
		}),
	});
	console.log(`This is the response from the update${await updateResult.json()}`);
	if (updateResult.ok) {
		const responseData = await updateResult.json();
		console.log('Response from update:', responseData);
	} else {
		throw new Error('Request failed');
	}
};

// export const uploadExecMongo = async (id: string, file) => {
// 	const refer = `experiment${id}`;

// 	const apiUrl = '/api/MongoREST/SubmitBinaryDataHandler';
// 	const formDataInput = new FormData();
// 	formDataInput.append('file', file);
// 	formDataInput.append('expId', refer);

// 	try {
// 		const result = await fetch(apiUrl, {
// 			method: 'POST',
// 			// Not sure which header to put
// 			// headers: {
// 			// 	'Content-Type': 'application/json',
// 			// },
// 			body: formDataInput,
// 		});

// 		if (result.ok) {
// 			const data = await result.json();
// 			console.log('File uploaded:', data.fileId);
// 		} else {
// 			console.error('File upload failed:', result.statusText);
// 		}
// 	} catch (error) {
// 		console.error('Error uploading file:', error.message);
// 	}
// };


