/* eslint-disable no-mixed-spaces-and-tabs */
import { ExperimentData } from './db_types';
import { ResultsCsv, ProjectZip } from '../lib/mongodb_types';

export const DB_COLLECTION_EXPERIMENTS = 'Experiments';

// test
export const submitExperiment = async (values: Partial<ExperimentData>, userId: string) => {
	values.creator = userId;
	values.created = Date.now();
	values.finished = false;
	values.estimatedTotalTimeMinutes = 0;
	values.totalExperimentRuns = 0;
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

export const downloadExperimentResults = async (expId: string) => {
	console.log(`Downloading results for ${expId}...`);
	await fetch(`/api/download/csv/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((record: ResultsCsv) => {
		console.log(record);
		const csvContents = record.resultContent;
		const url = `data:text/plain;charset=utf-8,${encodeURIComponent(csvContents)}`;
		downloadArbitraryFile(url, `result${expId}.csv`);
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
	await fetch(`/api/download/zip/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((record: ProjectZip) => {
		console.log(record);
		const zipContents = record.fileContent;
		const url = `data:text/plain;base64,${encodeURIComponent(zipContents)}`;
		downloadArbitraryFile(url, `project_${expId}.zip`);
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
