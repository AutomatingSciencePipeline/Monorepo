import Dash from '../components/Dashboard';
import supabase from '../supabase/client';
import { initializeApp } from "firebase/app";
import { getDocs, getFirestore, updateDoc } from "firebase/firestore";
import { collection, query, where, setDoc, doc } from "firebase/firestore";
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
const experimentsCollection = collection(db,"Experiments")
const storage = getStorage(app);

const Dashboard = ({ user, experiments }) => {
    console.log(user)
    console.log(experiments);
	return <Dash user={user} experimentss={experiments} />;
};

export async function getServerSideProps({ req }) {
	const { user } = await supabase.auth.api.getUserByCookie(req);
    console.log('getssp user',user)

	// const { data, error } = await supabase
	// 	.from('experiments')
	// 	.select('*')
	// 	.eq('creator', user.id);
	// if (error) {
	// 	console.log(error);
	// }

	console.log("Retrieving experiments")
	const q = query(experimentsCollection, where("creator","==",user.id))
	const queryResults = await getDocs(q)
	
	var exps = []
	queryResults.forEach(doc =>exps.push(doc.data()))
	console.log(exps)
	return { props: { user, experiments: JSON.parse(JSON.stringify(exps)) } };
}

export default Dashboard;
