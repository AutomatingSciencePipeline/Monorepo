'use client'

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useSession } from "next-auth/react";

const ProtectedRoute = ({ children }) => {
	const session = useSession();
	const router = useRouter();
	useEffect(() => {
		if (session.status != "loading" && !session.data?.user) {
			router.push('/');
		}
	}, [!session.data?.user, router, session.status]);

	return <>{session.data?.user ? children : 'Not logged in'}</>;
};

export default ProtectedRoute;
