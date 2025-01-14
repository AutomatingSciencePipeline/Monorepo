/* eslint-disable no-mixed-spaces-and-tabs */
import { ExperimentData } from './db_types';
import { ResultsCsv, ProjectZip } from '../lib/mongodb_types';

export const DB_COLLECTION_EXPERIMENTS = 'Experiments';

// test
export const submitExperiment = async (values: Partial<ExperimentData>, userId: string, fileId: string) => {
	values.creator = userId;
	values.created = Date.now();
	values.finished = false;
	values.estimatedTotalTimeMinutes = 0;
	values.totalExperimentRuns = 0;
	values.file = fileId;
	const response = await fetch(`/api/experiments/storeExp`,
		{
			method: "POST",
			body: JSON.stringify(values)
		}
	)
	return await response.json();
};


const downloadArbitraryFile = (url: string, name: string) => {
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = name;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
};

const fetchExperimentDetails = async (expId: string) => {
	const response = await fetch(`/api/experiments/get/${expId}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch experiment details: ${response.status}`);
	}
	return response.json();
};

const formatFilename = (name: string, timestamp: string, extension: string) => {
	const formattedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
	const formattedTimestamp = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
	return `${formattedName}_${formattedTimestamp}.${extension}`;
};

export const downloadExperimentResults = async (expId: string) => {
	console.log(`Downloading results for ${expId}...`);
	// TODO: Figure out why it is waiting forever.
	const { expName, expStartedAt } = await fetchExperimentDetails(expId);

	await fetch(`/api/download/csv/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((record: ResultsCsv) => {
		console.log(record);
		const csvContents = record.resultContent;
		const url = `data:text/plain;charset=utf-8,${encodeURIComponent(csvContents)}`;
		const filename = formatFilename(expName, expStartedAt, 'csv');
		// TODO: Remove console.log
		console.log(filename)
		downloadArbitraryFile(url, filename);
	}).catch((response: Response) => {
		console.warn('Error downloading results', response.status);
		response.json().then((json: any) => {
			console.warn(json?.response ?? json);
			const message = json?.response;
			if (message) {
				alert(`Error downloading results: ${message}`);
			}
		});
	});
};

export const downloadExperimentProjectZip = async (expId: string) => {
	console.log(`Downloading project zip for ${expId}...`);
	const { name, startedAt } = await fetchExperimentDetails(expId);

	await fetch(`/api/download/zip/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((record: ProjectZip) => {
		console.log(record);
		const zipContents = record.fileContent;
		const url = `data:text/plain;base64,${encodeURIComponent(zipContents)}`;
		const filename = formatFilename(name, startedAt, 'zip');
		// TODO: Remove console.log
		console.log(filename)
		downloadArbitraryFile(url, filename);
	}).catch((response: Response) => {
		console.warn('Error downloading results', response.status);
		response.json().then((json: any) => {
			console.warn(json?.response ?? json);
			const message = json?.response;
			if (message) {
				alert(`Error downloading results: ${message}`);
			}
		});
	});
};

export const getExperimentDataForGraph = async (expId: string) => {
	console.log(`Getting results for ${expId} to use in graph modal...`);
	await fetch(`/api/download/csv/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((record: ResultsCsv) => {
		console.log(record);
		return record;
	}).catch((response: Response) => {
		console.warn('Error getting experiment results', response.status);
		response.json().then((json: any) => {
			console.warn(json?.response ?? json);
			const message = json?.response;
			if (message) {
				alert(`Error getting experiment results: ${message}`);
			}
		});
	});
}