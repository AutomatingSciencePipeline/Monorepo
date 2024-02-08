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
		// body: JSON.stringify({
		// 	'content': 'expId',
		// }),
	});
	// console.log(`This is the response from the finding ${await findResult.json()}`);
	// if (findResult.ok) {
	// 	const responseData = await findResult.json();
	// 	console.log('Response from finding:', responseData);
	// } else {
	// 	throw new Error('Request for finding failed');
	// }

	return await findResult;
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
		return false;
	}
};

