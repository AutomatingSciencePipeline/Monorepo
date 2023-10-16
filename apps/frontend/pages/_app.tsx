import ProtectedRoute from '../components/auth/ProtectedRoute';
import '../styles/globals.css';
import '../styles/experimentListing.css';
import { AuthProvider } from '../firebase/fbAuth';

const noAuthRequired = ['/', '/signin'];

function GladosApp({ Component, pageProps, router }) {
	return (
		<AuthProvider>
			{noAuthRequired.includes(router.pathname) ? (
				<Component {...pageProps} key={router.route} />
			) : (
				<ProtectedRoute>
					<Component {...pageProps} key={router.route} />
				</ProtectedRoute>
			)}
		</AuthProvider>
	);
}

export default GladosApp;
