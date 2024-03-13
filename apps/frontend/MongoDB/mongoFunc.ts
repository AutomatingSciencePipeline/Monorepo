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
	console.log('findResultWCallback result is: ', jsonResult);
	callback(jsonResult);
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

// export const subscribeToExpMongo = (id: String) => {
// 	const eventSource = new EventSource(`/api/MongoREST/MongoFrontend/IdConnection/${id}`);

// 	// Handle events from SSE
// 	eventSource.onmessage = (event) => {
// 		const message = JSON.parse(event.data);
// 		console.log('the received message from mongo is: ', message);
// 		// Checking whether the message is the inital data or not
// 		// if (Array.isArray(message)) {
// 		// 	callback();
// 		// } else {
// 		// 	callback();
// 		// }
// 	};

// 	const unsubscribe = () => {
// 		eventSource.close();
// 	};

// 	return unsubscribe;
// };
