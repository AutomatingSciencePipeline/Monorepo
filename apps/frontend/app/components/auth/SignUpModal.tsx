'use client'

import { joiResolver, useForm } from '@mantine/form';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AiOutlineGithub, AiOutlineGoogle, AiOutlineTwitter } from 'react-icons/ai';
import { signUpSchema } from '../../../utils/validators';
import { useSession } from "next-auth/react";

export const SignUpModal = ({ afterSignUp }) => {
	const form = useForm({
		initialValues: {
			email: '',
			password: '',
			passwordRepeat: '',
		},
		schema: joiResolver(signUpSchema),
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
						<span className='px-2 bg-white text-gray-500'>
							(OAuth login support coming soon™)
						</span>
						<div className='pt-3 grid grid-cols-3 gap-3'>
							{/* TODO implement OAuth sign in */}

							{/* <div>
								<a
									href='#'
									className='w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50'
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
								>
									<span className='sr-only'>
										Sign in with Twitter
									</span>
									<AiOutlineTwitter className='w-5 h-5' />
								</a>
							</div>

							<div>
								<a
									href='#'
									className='w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50'
								>
									<span className='sr-only'>
										Sign in with GitHub
									</span>
									<AiOutlineGithub className='w-5 h-5' />
								</a>
							</div> */}
						</div>
					</div>

					<div className='mt-3 relative'>
						<div
							className='absolute inset-0 flex items-center'
							aria-hidden='true'
						>
							<div className='w-full border-t border-gray-300' />
						</div>
						<div className='relative flex justify-center text-sm'>
							<span className='px-2 bg-white text-gray-500'>
								Or
							</span>
						</div>
					</div>

					<div className='mt-2'>
						<div className='mb-3'>
							<p className='text-sm font-medium text-gray-700'>
								Create an Account
							</p>
						</div>
						<form
							onInvalid={() => {
								console.log('Form is invalid (this only triggers when Mantine already has a hover tooltip for stuff)');
							}}
							onSubmit={form.onSubmit(async (values) => {
								console.log('Sign in was submitted');
								const { email, password } = values;
								setButtonDisabled(true);
								setButtonText(SIGN_UP_LOADING_TEXT);
								try {
									await authService.signUpWithEmailAndPassword(
										email,
										password
									);
									afterSignUp();
								} catch (error) {
									console.log('Sign up error', error);
									form.setErrors({
										firebaseError: error?.message,
									});
									setButtonText(DEFAULT_SIGN_UP_TEXT);
									setButtonDisabled(false);
								}
							})}
							className='space-y-6'
						>
							<div>
								<label
									htmlFor='mobile-or-email'
									className='sr-only'
								>
									Email
								</label>
								<input
									type='text'
									autoComplete='email'
									placeholder='Email'
									required
									{...form.getInputProps('email')}
									className='block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md' />
							</div>

							<div>
								<label htmlFor='password' className='sr-only'>
									Password
								</label>
								<input
									type='password'
									placeholder='Password'
									autoComplete='current-password'
									{...form.getInputProps('password')}
									required
									className='block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md' />
							</div>

							<div>
								<label htmlFor='passwordRepeat' className='sr-only'>
									Password Repeated
								</label>
								<input
									type='password'
									{...form.getInputProps('passwordRepeat')}
									placeholder='Repeat Password'
									required
									className='block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md' />
							</div>

							<div>
								<button
									type='submit'
									disabled={buttonDisabled}
									className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
								>
									{buttonText}
								</button>
							</div>

							<div className='text-red-500'>
								{ formHasError ?
									<ul>
										{Object.entries(form.errors).map((error) => {
											return (
												<li key={error[0]}>
													{error[1]}
												</li>
											);
										})}
									</ul> :
									null}
							</div>
						</form>
					</div>
					<div className='mt-3 relative'>
						<div
							className='absolute inset-0 flex items-center'
							aria-hidden='true'
						>
							<div className='w-full border-t border-gray-300' />
						</div>
						<div className='relative flex justify-center text-sm'>
							<span className='px-2 bg-white text-gray-500'>
								Already have an account?
							</span>
						</div>
					</div>
					<div className='mt-3'>
						<Link
							href={'/signin'}
							className='space-x-6 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>

									Go to the Login Page

						</Link>
					</div>
				</div>
				<div className='px-4 py-6 bg-gray-50 border-t-2 border-gray-200 sm:px-10'>
					<p className='text-xs leading-5 text-gray-500'>
						By signing up, you agree to our{' '}
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
