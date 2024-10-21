'use client'

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useSession } from "next-auth/react"

const ProtectedRoute = ({ children }) => {
	const { data: session } = useSession();
	const router = useRouter();
	useEffect(() => {
		if (!session) {
			console.log('User is not signed in; redirecting them to /signin');
			router.push('/signin');
		}
	}, [session, router]);

	return <>{session ? children : 'Not logged in'}</>;
};

export default ProtectedRoute;
