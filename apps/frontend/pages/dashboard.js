import Dash from '../components/Dashboard';
//import supabase from '../supabase/client';
import firebase from '../firebase/firebaseClient';
const Dashboard = ({ user, experiments }) => {
    console.log(user)
    console.log(experiments);
	return <Dash user={user} experimentss={experiments} />;
};

export async function getServerSideProps({ req }) {
	const { user } = await firebase.auth.api.getUserByCookie(req);
    console.log('getssp user',user)

	const { data, error } = await firebase
		.from('experiments')
		.select('*')
		.eq('creator', user.id);

	if (error) {
		console.log(error);
	}

	return { props: { user, experiments: data } };
}

export default Dashboard;
