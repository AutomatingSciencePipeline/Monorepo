import { FirebaseUserId } from '../firebase/db';
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
		tag: values.tag,
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
		throw new Error('Request experiment failed');
	}

	return experiment.expId;
};

// Not really being used right now... This step is being done in the backend.
export const updateMongoDoc = async (expId: String) => {
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
		throw new Error('Request for update failed');
	}
};

// Finding one experiment by its ID
export const findExp = async (expId: String ) => {
	const findUrl = `/api/MongoREST/MongoFrontend/${expId}`;
	const findResult = await fetch(findUrl, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	const jsonResult = await findResult.json();
	return jsonResult['experiment'];
};

export interface ExperimentSubscribeCallback {
	(data: Partial<ExperimentData>): any;
}

export const findExpWCallback = async (expId: String, callback: ExperimentSubscribeCallback) => {
	const findUrl = `/api/MongoREST/MongoFrontend/${expId}`;
	const findResult = await fetch(findUrl, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	const jsonResult = await findResult.json();
	console.log('findResultWCallback result is: ', jsonResult['experiments']);
	callback(jsonResult['experiments']);
};

// Finding experiments by the user's ID
// export const fetchExperimentsByUserId = async (userId: string) => {
// 	console.log(`Fetching experiments for user ${userId}...`);
// 	await fetch(`/api/MongoREST/MongoFrontend/user/${userId}`)
// 		.then((response) => {
// 			if (response.ok) {
// 				return response.json();
// 			}
// 			return Promise.reject(response);
// 		})
// 		.then((experiments: ExperimentData[]) => {
// 			console.log(`Fetched ${experiments.length} experiments for user ${userId}.`, experiments);
// 			return experiments;
// 		})
// 		.catch((error: Response) => {
// 			console.error('Error fetching experiments:', error.status);
// 			error.json().then((json) => {
// 				console.error(json?.response ?? json);
// 				const message = json?.response;
// 				if (message) {
// 					alert(`Error fetching experiments: ${message}`);
// 				}
// 			}).catch((err) => console.error('Error parsing error response:', err));
// 		});
// };

export const fetchExperimentsByUserId = async (userId: string): Promise<ExperimentData[] | null> => {
	console.log(`Fetching experiments for user ${userId}...`);
	try {
		const response = await fetch(`/api/MongoREST/MongoFrontend/user/${userId}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const experiments: ExperimentData[] = await response.json();
		console.log(`Fetched ${experiments.length} experiments for user ${userId}.`, experiments);
		return experiments;
	} catch (error) {
		console.error('Error fetching experiments:', error);
		// Optionally handle the error more gracefully here
		return null;
	}
};

export const saveToBackend = async (expId, file): Promise<Boolean> => {
	const saveUrl = '/api/MongoREST/saveToBackend';
	const data = new FormData();
	const expID = expId['experimentID'];
	data.append('file', file);
	data.append('id', expID);
	const saveResult = await fetch(saveUrl, {
		method: 'POST',
		body: data,
	});
	if (saveResult.ok) {
		const saveResultData = await saveResult.json();
		console.log('Response from saving to backend: ', saveResultData);
		return true;
	} else {
		throw new Error('Request to save failed');
	}
};

