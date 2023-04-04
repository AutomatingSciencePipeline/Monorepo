import { firebaseApp } from './firebaseClient';
import { getFirestore, updateDoc } from 'firebase/firestore';
import { collection, setDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { ExperimentData } from './db_types';

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

export const downloadExperimentResults = (expId: ExperimentDocumentId) => {
	console.log(`Downloading results for ${expId}`);
	const fileRef = ref(storage, `results/result${expId}.csv`);
	getDownloadURL(fileRef).then((url) => {
		downloadArbitraryFile(url, `result${expId}.csv`);
	}).catch((error) => {
		console.log('Get download url for exp error: ', error);
		alert(`Error downloading file: ${error.message}`);
	});
};

export const downloadExperimentProjectZip = (expId: ExperimentDocumentId) => {
	console.log(`Downloading project zip for ${expId}`);
	const fileRef = ref(storage, `results/result${expId}.zip`);
	getDownloadURL(fileRef).then((url) => {
		downloadArbitraryFile(url, `project_${expId}.zip`);
	}).catch((error) => {
		console.log('Get download url for zip error: ', error);
		alert(`Error downloading zip: ${error.message}`);
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
