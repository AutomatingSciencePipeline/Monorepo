// import supabase from './client';
// import admin from './admin';
import { initializeApp } from "firebase/app";
import { getFirestore, updateDoc, serverTimestamp } from "firebase/firestore";
import { collection, setDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";

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


export const subscribeToExp = (id, callback) => {
    // const experiments = supabase
    //   .from(`experiments:creator=eq.${uid},id=eq.${id}`)
    //   .on('*', payload => {
    //     console.log('changes', payload);
    //     callback(payload)
    //   })
    //   .subscribe()
	// console.log(db)
	// doc(db,"Experiments",id)
	// collection(db,"Experiments")
	// onSnapshot(, doc => callback(doc.data()))
	// console.log("id!!!!",id)
	// const q = query(experiments, where("id","==",id))
	// const unsubscribe = onSnapshot(q, (snapshot) => {
	// 	var result = []
	// snapshot.forEach(doc => result.push(doc.data()))
	// 	callback(result[0])
	// })


	const unsubscribe = onSnapshot(doc(db,"Experiments",id), doc =>{
		console.log(`exp ${id} has been updated: `,doc.data())
		 callback(doc.data())})
	return unsubscribe
} 


export const listenToExperiments = (uid, callback) => {
    // const experiments = supabase.from('experiments').on('INSERT',payload=> {
    //     console.log(payload)
    //     console.log(payload.new);
    //     callback(payload.new)
    // }).subscribe()

	const q = query(experiments, where("creator","==",uid))
	const unsubscribe = onSnapshot(q, (snapshot) => {
		var result = []
		snapshot.forEach(doc => result.push(doc.data()))
		callback(result)
	})
	return unsubscribe
}