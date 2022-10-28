import Dash from '../components/Dashboard';
import { useAuth } from '../firebase/fbAuth';

// TODO this used to use server-side props, not an option for firebase unless we use the next lib for it

const Dashboard = () => {

	const { authService } = useAuth();
	const experiments = []; // TODO get a real experiment list

	return <Dash user={authService.userId} experimentss={experiments} />;
};



export default Dashboard;
