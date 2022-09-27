// import supabase from './client';
// import admin from './admin';
import { initializeApp } from "firebase/app";
import { getFirestore, updateDoc } from "firebase/firestore";
import { collection, setDoc, doc } from "firebase/firestore";
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
	// console.log('Making submission');
	// const { data, error } = await supabase.from('experiments').insert([
	// 	{
	// 		creator: user.id,
	// 		name: values.name,
	// 		description: values.description,
	// 		verbose: values.verbose,
	// 		n_workers: values.nWorkers,
	// 		parameters: JSON.stringify({
	// 			params: values.parameters,
	// 		}),
	// 	},
	// ]);
	// if (error) {
	// 	throw error;
	// } else {
	// 	return { data };
	// }
	const newExperiment = doc(experiments)

	setDoc(newExperiment,{
		creator: user.id,
			name: values.name,
			description: values.description,
			verbose: values.verbose,
			workers: values.nWorkers,
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
		console.log("Uploaded file for experiment " + id)
		const experimentRef = doc(db,"Experiments",id)
		updateDoc(experimentRef,{
			file: "experiment"+id
		}).catch(error => console.log(error))
		return id
	}).catch(error =>{
		console.log(error)
		null
	} )

	// try {
	// 	const filePath = `EXP_${id}/${file.name}`;

	// 	const { error, data } = await supabase.storage
	// 		.from('experiment_files')
	// 		.upload(filePath, file);
        
	// 	if (error) {
	// 		throw error;
	// 	} else {
	// 		return data;
	// 	}
	// } catch (error) {
	// 	alert(error.message);
	// } finally {
	// 	// setUploading(false);
	// }
};


export const subscribeToExp = (id, uid, callback) => {
    const experiments = supabase
      .from(`experiments:creator=eq.${uid},id=eq.${id}`)
      .on('*', payload => {
        console.log('changes', payload);
        callback(payload)
      })
      .subscribe()
      
} 


export const listenToNew = (callback) => {
    const experiments = supabase.from('experiments').on('INSERT',payload=> {
        console.log(payload)
        console.log(payload.new);
        callback(payload.new)
    }).subscribe()
}