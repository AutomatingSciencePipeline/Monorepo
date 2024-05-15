import { ExperimentData } from '../MongoDB/mongodb_types';

export const submitMongoExperiment = async (values: Partial<ExperimentData>, userId: string): Promise<string> => {
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
export const updateMongoDoc = async (expId: string, updateKey: string, updateValue: string) => {
	const updateUrl = `/api/MongoREST/${expId}`;
	const updateResult = await fetch(updateUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			'content': updateKey,
			'valueToUpdate': updateValue,
		}),
	});
	console.log(`This is the response from the update ${await updateResult.json()}`);
};

export const deleteExpMongo = async (expId: string) => {
	const delUrl = `/api/MongoREST/${expId}`;
	console.log(`The url to delete is ${delUrl}`);
	const delResult = await fetch(delUrl, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (delResult.ok) {
		const responseData = await delResult.json();
		console.log('Response from delete:', responseData);
	} else {
		throw new Error('Request for delete failed');
	}
};

// Finding one experiment by its ID
export const findExp = async (expId: string ) => {
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

export const findExpWCallback = async (expId: string, callback: ExperimentSubscribeCallback) => {
	const findUrl = `/api/MongoREST/MongoFrontend/${expId}`;
	console.log('url is: ', findUrl);
	const findResult = await fetch(findUrl, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	const jsonResult = await findResult.json();
	console.log('findResultWCallback result is: ', jsonResult);
	// jsonResult['experiment']
	callback(jsonResult);
};

export const fetchExperimentsByUserId = async (userId: string): Promise<ExperimentData[] | null> => {
	console.log(`Fetching experiments for user ${userId}...`);
	try {
		const response = await fetch(`/api/MongoREST/MongoFrontend/user/${userId}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const experiments = await response.json();

		const parsedExperiments = experiments.map((exp) => {
			return exp['experiment'];
		});
		console.log(`Fetched ${experiments.length} experiments for user ${userId}.`, parsedExperiments);
		return parsedExperiments;
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

