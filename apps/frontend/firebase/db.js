import { firebaseApp } from "./firebaseClient";
import { getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { collection, setDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const experiments = collection(db,"Experiments")

export const submitExperiment = async (values, userId) => {
	const newExperiment = doc(experiments)
	console.log("Experiment submitted. Values:", values);
	setDoc(newExperiment,{
		creator: userId,
			name: values.name,
			description: values.description,
			verbose: values.verbose,
			workers: values.nWorkers,
			expId: newExperiment.id,
			fileOutput: values.fileOutput,
			resultOutput: values.resultOutput,
			finished: false,
			created: Date.now(),
			params: JSON.stringify({
							params: values.parameters,
						})
	})
	console.log("Created Experiment: " + newExperiment.id)
	return newExperiment.id
};


export const uploadExec = async (id, file) => {
	const fileRef = ref(storage, "experiment"+id)
	uploadBytes(fileRef, file).then((snapshot) => {
		const experimentRef = doc(db,"Experiments",id)
		updateDoc(experimentRef,{
			file: "experiment"+id
		}).then(() => {
			console.log("Uploaded file for experiment " + id)
			return true
		}).catch(error => console.log(error))
		return true
	}).catch(error =>{
		console.log(error)
		return false
	} )
};

export const getDocById = (id) => {
	getDoc(doc(db, "Experiments", id)).then(docSnap => {
		if (docSnap.exists()) {
			return docSnap.data();
		} else {
		  console.log("No such document!");
		}
	})

}

export const downloadExp = (event) => {
	const id = event.target.getAttribute('data-id')
	console.log(`Downloading results for ${id}`)
	const fileRef = ref(storage,`results/result${id}.csv`)
	getDownloadURL(fileRef).then(url => {
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `result${id}.csv`
		document.body.appendChild(anchor)
		anchor.click()
		document.body.removeChild(anchor)
	}).catch(error => console.log(error))
}

export const downloadExpZip = (event) => {
	const id = event.target.getAttribute('data-id')
	console.log(`Downloading results for ${id}`)
	const fileRef = ref(storage,`results/result${id}.zip`)
	getDownloadURL(fileRef).then(url => {
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `result${id}.csv`
		document.body.appendChild(anchor)
		anchor.click()
		document.body.removeChild(anchor)
	}).catch(error => console.log(error))
}

export const subscribeToExp = (id, callback) => {
	const unsubscribe = onSnapshot(doc(db,"Experiments",id), doc =>{
		console.log(`exp ${id} has been updated: `,doc.data())
		 callback(doc.data())})
	return unsubscribe
}


export const listenToExperiments = (uid, callback) => {
	const q = query(experiments, where("creator","==",uid))
	const unsubscribe = onSnapshot(q, (snapshot) => {
		var result = []
		snapshot.forEach(doc => result.push(doc.data()))
		callback(result)
	})
	return unsubscribe
}
