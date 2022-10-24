// import supabase from './client';
// import admin from './admin';
import { initializeApp } from "firebase/app";
import { getFirestore, updateDoc, serverTimestamp } from "firebase/firestore";
import { collection, setDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { createElement } from "react";

const firebaseConfig = {
	apiKey: "AIzaSyDj-Y8FFq2C80ZSVUVAWd3eqcmSzXMHXus",
	authDomain: "gladosbase.firebaseapp.com",
	databaseURL: "https://gladosbase-default-rtdb.firebaseio.com",
	projectId: "gladosbase",
	storageBucket: "gladosbase.appspot.com",
	messagingSenderId: "431843551362",
	appId: "1:431843551362:web:0bb28196e90f31a194ec9b"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig,"backend");
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const experiments = collection(db,"Experiments")
const storage = getStorage(app);


export const submitExperiment = async (values, user) => {
	const newExperiment = doc(experiments)

	setDoc(newExperiment,{
		creator: user.id,
			name: values.name,
			description: values.description,
			verbose: values.verbose,
			workers: values.nWorkers,
			expId: newExperiment.id,
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