/* eslint-disable no-mixed-spaces-and-tabs */
import { firebaseApp } from './firebaseClient';
import { getFirestore, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { collection, setDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { ExperimentData } from './db_types';
import { ResultsCsv, ProjectZip } from '../lib/mongodb_types';

export const DB_COLLECTION_EXPERIMENTS = 'Experiments';

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const experiments = collection(db, DB_COLLECTION_EXPERIMENTS);

export type FirebaseId = string;
export type FirebaseDocumentId = FirebaseId;
export type FirebaseUserId = FirebaseId;

export type ExperimentDocumentId = FirebaseDocumentId;

// test
export const submitExperiment = async (values: Partial<ExperimentData>, userId: FirebaseUserId) => {
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

export const downloadExperimentResults = async (expId: ExperimentDocumentId) => {
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

export const downloadExperimentProjectZip = async (expId: ExperimentDocumentId) => {
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




export interface MultipleExperimentSubscribeCallback {
	(data: Partial<ExperimentData>[]): any;
}

// TODO: Convert from Firestore MongoDB
export const listenToExperiments = (uid: FirebaseUserId, callback: MultipleExperimentSubscribeCallback) => {
	const q = query(experiments, where('creator', '==', uid));
	const unsubscribe = onSnapshot(q, (snapshot) => {
		const result = [] as unknown as Partial<ExperimentData>[];
		snapshot.forEach((doc) => result.push(doc.data()));
		callback(result);
	});
	return unsubscribe;
};

// TODO: Test this!
export const deleteExperiment = async (expId: ExperimentDocumentId) => {
	await fetch(`/api/experiments/delete/${expId}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((expId: String) => {
		console.log(expId);
	}).catch((response: Response) => {
		// might need this
	});
};

// TODO: Test this!
export const updateExperimentName = async (expId, updatedName) => {
	await fetch(`/api/experiments/updatename/${expId}/${updatedName}`).then((response) => {
		if (response?.ok) {
			return response.json();
		}
		return Promise.reject(response);
	}).then((expId: String) => {
		console.log(expId);
	}).catch((response: Response) => {
		// might need this
	});
};


// Function to get the project name from Firebase
// TODO: Convert from Firestore to MongoDB
// Not being used right now; we have [expIdToGet].tsx, which might render this useless anyway.
export const getCurrentProjectName = async (projectId) => {
	try {
	  // Reference the project document in Firebase
	  const experimentRef = doc(db, DB_COLLECTION_EXPERIMENTS, projectId);

	  // Get the project document
	  const docSnapshot = await getDoc(experimentRef);

	  if (docSnapshot.exists()) {
		// Extract and return the project name
			return docSnapshot.data().name;
	  } else {
			console.error('Project document does not exist.');
			return null;
	  }
	} catch (error) {
	  console.error('Error getting project name:', error);
	  return null;
	}
};
