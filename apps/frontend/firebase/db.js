import { initializeApp } from "firebase/app";
import { getFirestore, updateDoc } from "firebase/firestore";
import { collection, setDoc, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { firebaseApp } from "./firebaseClient";

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(firebaseApp);
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
	// TODO used to be supabase subscription to info about one single experiment? seems like a bandaid
} 


export const listenToNew = (callback) => {
	// TODO used to be supabase fire callback when a new experiment was added to the table
}
