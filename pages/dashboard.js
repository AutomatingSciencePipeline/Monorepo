import Dash from '../components/Dashboard';
import supabase from '../supabase/client';
const Dashboard = ({ user, experiments }) => {
	return <Dash user={user} experiments={experiments} />;
};

export async function getServerSideProps({ req }) {
	const { user } = await supabase.auth.api.getUserByCookie(req);

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
