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

export const submitExperiment = async (values: Partial<ExperimentData>, userId: FirebaseUserId): Promise<FirebaseId> => {
	const newExperimentDocument = doc(experiments);
	console.log('Experiment submitted. Values:', values);
	setDoc(newExperimentDocument, {
		creator: userId,
		name: values.name,
		description: values.description,
		verbose: values.verbose,
		workers: values.workers,
		expId: newExperimentDocument.id,
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
	});
	console.log(`Created Experiment: ${newExperimentDocument.id}`);
	return newExperimentDocument.id;
};


export const uploadExec = async (id: ExperimentDocumentId, file) => {
	const fileRef = ref(storage, `experiment${id}`);
	return await uploadBytes(fileRef, file).then((snapshot) => {
		console.log('Uploaded file. Updating doc...');
		const experimentRef = doc(db, DB_COLLECTION_EXPERIMENTS, id);
		updateDoc(experimentRef, {
			file: `experiment${id}`,
		}).then(() => {
			console.log(`Uploaded file for experiment ${id}`);
			return true;
		}).catch((error) => console.log('Upload doc error: ', error));
		return true;
	}).catch((error) => {
		console.log('Upload bytes error: ', error);
		return false;
	});
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

export interface ExperimentSubscribeCallback {
	(data: Partial<ExperimentData>): any;
}

export const subscribeToExp = (id: ExperimentDocumentId, callback: ExperimentSubscribeCallback) => {
	const unsubscribe = onSnapshot(doc(db, DB_COLLECTION_EXPERIMENTS, id), (doc) => {
		console.log(`exp ${id} data updated: `, doc.data());
		callback(doc.data() as Partial<ExperimentData>);
	});
	return unsubscribe;
};


export interface MultipleExperimentSubscribeCallback {
	(data: Partial<ExperimentData>[]): any;
}

export const listenToExperiments = (uid: FirebaseUserId, callback: MultipleExperimentSubscribeCallback) => {
	const q = query(experiments, where('creator', '==', uid));
	const unsubscribe = onSnapshot(q, (snapshot) => {
		const result = [] as unknown as Partial<ExperimentData>[];
		snapshot.forEach((doc) => result.push(doc.data()));
		callback(result);
	});
	return unsubscribe;
};

export const deleteExperiment = async (expId: ExperimentDocumentId) => {
	const experimentRef = doc(db, DB_COLLECTION_EXPERIMENTS, expId);
	console.log(`Deleting ${expId} from firestore...`);
	deleteDoc(experimentRef).then(() => {
		console.log(`Deleted experiment ${expId}`);
		return true;
	}).catch((error) => console.log('Delete experiment error: ', error));
	return false;
};

export const updateProjectNameInFirebase = async (projectId, updatedName) => {
	try {
	  // Reference the project document in Firebase
	  const experimentRef = doc(db, DB_COLLECTION_EXPERIMENTS, projectId);

	  // Update the project name
	  await updateDoc(experimentRef, { name: updatedName });
	} catch (error) {
	  console.error('Error updating project name:', error);
	}
};


// Function to get the project name from Firebase
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
