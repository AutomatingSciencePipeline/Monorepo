'use client'

import { joiResolver, useForm } from '@mantine/form';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AiOutlineGithub, AiOutlineGoogle, AiOutlineTwitter } from 'react-icons/ai';
import { signUpSchema } from '../../../utils/validators';
import { signIn, useSession } from "next-auth/react";

export const SignUpModal = ({ afterSignUp }) => {
	const form = useForm({
		initialValues: {
			email: '',
			password: '',
			passwordRepeat: '',
		},
		validate: joiResolver(signUpSchema),
	});
	const DEFAULT_SIGN_UP_TEXT = 'Create your account';
	const SIGN_UP_LOADING_TEXT = 'Loading...';
	const { data: session } = useSession();
	const [buttonDisabled, setButtonDisabled] = useState(false);
	const [buttonText, setButtonText] = useState(DEFAULT_SIGN_UP_TEXT);

	const formHasError = useMemo(() => {
		return Object.keys(form.errors).length !== 0;
	}, [form.errors]);

	useEffect(() => {
		if (formHasError) {
			console.log('Form errors', form.errors);
		}
	}, [formHasError, form.errors]);

	return (
		<div className='mt-16 sm:mt-24 lg:mt-0 lg:col-span-6'>
			<div className='bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
				<div className='px-4 py-8 sm:px-10'>
					<div>
						<p className='text-sm font-medium text-gray-700'>
							Sign in with
						</p>
						<div className='pt-3 grid grid-cols-3 gap-3'>

							<div>
								<a
									href='#'
									className='w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50'
									onClick={() => signIn("google", { redirectTo: "/dashboard" })}
								>
									<span className='sr-only'>
										Sign in with Google
									</span>
									<AiOutlineGoogle className='w-5 h-5' />
								</a>
							</div>

							<div>
								<a
									href='#'
									className='w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50'
									onClick={() => signIn("github", { redirectTo: "/dashboard" })}
								>
									<span className='sr-only'>
										Sign in with GitHub
									</span>
									<AiOutlineGithub className='w-5 h-5' />
								</a>
							</div>
							{/* For dev testing!!! */}
							<button onClick={() => {signIn("keycloak", {redirectTo: "/dashboard"})}}>Keycloak</button>
						</div>
					</div>
				</div>
				<div className='px-4 py-6 bg-gray-50 border-t-2 border-gray-200 sm:px-10'>
					<p className='text-xs leading-5 text-gray-500'>
						By creating an account, you agree to our{' '}
						<a
							href='#TODO'
							className='font-medium text-gray-900 hover:underline'
						>
							Terms
						</a>
						,{' '}
						<a
							href='#TODO'
							className='font-medium text-gray-900 hover:underline'
						>
							Data Policy
						</a>{' '}
						and{' '}
						<a
							href='#TODO'
							className='font-medium text-gray-900 hover:underline'
						>
							Cookies Policy
						</a>
						.
					</p>
				</div>
			</div>
		</div>
	);
};
