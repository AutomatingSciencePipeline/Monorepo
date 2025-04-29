/* eslint-disable no-mixed-spaces-and-tabs */
import { ResultsCsv, ProjectZip } from '../lib/mongodb_types';

export const DB_COLLECTION_EXPERIMENTS = 'Experiments';

export const getExperimentDataForGraph = async (expId: string) => {
	await fetch(`/api/download/csv/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((record: ResultsCsv) => {
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