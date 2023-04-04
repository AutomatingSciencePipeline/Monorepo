import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useAuth } from '../../firebase/fbAuth';

const ProtectedRoute = ({ children }) => {
	const { user } = useAuth();
	const router = useRouter();
	useEffect(() => {
		if (!user) {
			console.log('User is not signed in; redirecting them to /signin');
			router.push('/signin');
		}
	}, [user, router]);

	return <>{user ? children : 'Not logged in'}</>;
};

export default ProtectedRoute;
