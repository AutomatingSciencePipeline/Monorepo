import Dash from '../components/Dashboard';
import supabase from '../supabase/client';
const Dashboard = ({ user, experiments }) => {
    console.log(user)
    console.log(experiments);
	return <Dash user={user} experimentss={experiments} />;
};

export async function getServerSideProps({ req }) {
	const { user } = await supabase.auth.api.getUserByCookie(req);
    console.log('getssp user',user)

	const { data, error } = await supabase
		.from('experiments')
		.select('*')
		.eq('creator', user.id);

	if (error) {
		console.log(error);
	}

	return { props: { user, experiments: data } };
}

export default Dashboard;
