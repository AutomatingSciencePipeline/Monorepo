'use client'

import { useRouter } from 'next/navigation';
import { SignInModal } from '../components/auth/SignInModal';

const SignInPage = () => {
	const router = useRouter();
	router.push('/');
};

export default SignInPage;

