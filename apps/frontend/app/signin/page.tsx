'use client'

import { useRouter } from 'next/navigation';
import { SignInModal } from '../components/auth/SignInModal';

const SignInPage = () => {
	const router = useRouter();

	return (
		<div className='bg-gray-800 h-full'>
			<div className='min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
				<div className='sm:mx-auto sm:w-full sm:max-w-md'>
					<img
						className='mx-auto h-12 w-auto'
						src='https://tailwindui.com/img/logos/workflow-mark-blue-600.svg'
						alt='Workflow'
					/>
					<h2 className='mt-6 text-center text-3xl font-extrabold text-white'>
						Sign in to your account
					</h2>
				</div>
				<SignInModal afterSignIn={() => {
					console.log('Sign in success, loading dashboard...');
					router.push('/dashboard');
				}} />
			</div>
		</div>
	);
};

export default SignInPage;

