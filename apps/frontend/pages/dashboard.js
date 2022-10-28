import { useAuth } from '../firebase/fbAuth';
import { collection, query, where, getDocs, getFirestore } from "firebase/firestore";
import { firebaseApp } from '../firebase/firebaseClient';
import { useEffect, useState } from 'react';
import Dash from '../components/Dashboard';

// TODO this used to use server-side props, not an option for firebase unless we use the next lib for it
const Dashboard = () => {
	const { authService } = useAuth();
	const userId = authService.userId;

	const [ experiments, setExperiments ] = useState([]);

	// TODO probably a better way to do this, but getting it working like server side props used to
	useEffect(() => {
		async function fetchData() {
			if (!userId) {
				console.log("No user id yet");
				setExperiments([]);
				return;
			}
			// Initialize Cloud Firestore and get a reference to the service
			const db = getFirestore(firebaseApp);
			const experimentsCollection = collection(db,"Experiments")
	
			console.log("Retrieving experiments... db", db)
			console.log("experimentsCollection", experimentsCollection)
			console.log("id", userId)
			const q = query(experimentsCollection, where("creator","==", userId))
			const queryResults = await getDocs(q);
			
			let exps = []
			queryResults.forEach(doc =>exps.push(doc.data()))
			console.log("Experiments", exps)
			setExperiments(JSON.parse(JSON.stringify(exps))); // TODO why string->parse?
		}
		fetchData();
	}, [userId]);

	return <Dash user={userId} experimentss={experiments} />;
}

export default Dashboard;
