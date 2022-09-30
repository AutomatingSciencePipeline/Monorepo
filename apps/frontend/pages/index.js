import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { MenuIcon, XIcon } from '@heroicons/react/outline';
import { ChevronRightIcon } from '@heroicons/react/solid';
import {
	AiOutlineGoogle,
	AiOutlineTwitter,
	AiOutlineGithub,
} from 'react-icons/ai';
import { joiResolver, useForm } from '@mantine/form';
import Dashboard from '../components/Dashboard';
import { Logo } from '../components/utils';
import { signUpSchema } from '../utils/validators';
import { useAuth } from '../supabase/auth';

export default function Home() {
	const signUpForm = useForm({
		initialValues: {
			email: '',
			password: '',
		},
		schema: joiResolver(signUpSchema),
	});

	return <HomePage form={signUpForm} />;
}

// export default function Home() {
function HomePage({ form }) {
	const router = useRouter();
	const { user, authService } = useAuth();
	// if (user) {
	// 	// router.push('/dashboard');
	// }
	return (
		<div className={`w-full h-full`}>
			<Head>
				<title>Glados</title>
			</Head>
			<main className={`${styles.main} h-full`}>
				<div className='h-full w-full relative bg-gray-800 overflow-hidden'>
					<div
						className='hidden sm:block sm:absolute sm:inset-0 h-full'
						aria-hidden='true'
					>
						<svg
							className='absolute bottom-0 right-0 transform translate-x-1/2 mb-48 text-gray-700 lg:top-0 lg:mt-28 lg:mb-0 xl:transform-none xl:translate-x-0'
							width={364}
							height={384}
							viewBox='0 0 364 384'
							fill='none'
						>
							<rect
								width={364}
								height={384}
								fill='url(#eab71dd9-9d7a-47bd-8044-256344ee00d0)'
							/>
						</svg>
						{/* <Logo /> */}
					</div>
					<div className='h-full flex flex-col justify-around relative pt-6 pb-16 sm:pb-24'>
						<Popover>
							<nav
								className='relative max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6'
								aria-label='Global'
							>
								<div className='flex items-center flex-1'>
									<div className='flex items-center justify-between w-full md:w-auto'>
										<a href='#'>
											<span className='sr-only'>Workflow</span>
											<Logo />
										</a>
										<div className='-mr-2 flex items-center md:hidden'>
											<Popover.Button className='bg-gray-800 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus-ring-inset focus:ring-white'>
												<span className='sr-only'>Open main menu</span>
												<MenuIcon className='h-6 w-6' aria-hidden='true' />
											</Popover.Button>
										</div>
									</div>
								</div>
								<div className='hidden md:flex'>
									<Link href={'/auth'}>
										<a className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700'>
											Log in
										</a>
									</Link>
								</div>
							</nav>
						</Popover>

						<main className='h-full flex flex-col justify-around mt-16 sm:mt-24'>
							<div className='mx-auto max-w-7xl'>
								<div className='lg:grid lg:grid-cols-12 lg:gap-8'>
									<div className='px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left lg:flex lg:items-center'>
										<div>
											<a
												href='#'
												className='inline-flex items-center text-white bg-gray-900 rounded-full p-1 pr-2 sm:text-base lg:text-sm xl:text-base hover:text-gray-200'
											>
												<span className='px-3 py-0.5 text-white text-xs font-semibold leading-5 uppercase tracking-wide bg-blue-500 rounded-full'>
													We're launching!
												</span>
												<span className='ml-4 text-sm'>
													Visit our repository
												</span>
												<ChevronRightIcon
													className='ml-2 w-5 h-5 text-gray-500'
													aria-hidden='true'
												/>
											</a>
											<h1 className='mt-4 text-4xl tracking-tight font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6 lg:text-5xl xl:text-6xl'>
												<span className='md:block'>Automate science</span>{' '}
												<span className='text-blue-400 md:block'>
													with Glados
												</span>
											</h1>
											<p className='mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl'>
												A senior capstone project built for Rose-Hulman
												Institute of Technology, Glados aims to become the
												premier platform for researchers to share computational
												resources in performing compute-intensive research
												experiments. Join now!
											</p>
											<p className='mt-8 text-sm text-white uppercase tracking-wide font-semibold sm:mt-10'>
												Used by
											</p>
											<div className='mt-5 w-full sm:mx-auto sm:max-w-lg lg:ml-0'>
												{/* <div className='flex flex-wrap items-start justify-between'>
		                                        TODO: include rose logo and other stuff 
										</div> */}
											</div>
										</div>
									</div>
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
														</div>
													</div>
												</div>

												<div className='mt-6 relative'>
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

												<div className='mt-6'>
													<form
														onSubmit={form.onSubmit(async (values) => {
															try {
																const { error } =
																	await authService.signUpWithEmailAndPassword(
																		values.email,
																		values.password
																	);
																if (error) {
																	throw error;
																} else {
																	router.push('/dashboard');
																}
															} catch (error) {
																console.log(error);
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
																// name='mobile-or-email'
																// id='mobile-or-email'
																autoComplete='email'
																placeholder='Email'
																required
																{...form.getInputProps('email')}
																className='block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md'
															/>
														</div>

														<div>
															<label htmlFor='password' className='sr-only'>
																Password
															</label>
															<input
																// id='password'
																// name='password'
																type='password'
																placeholder='Password'
																autoComplete='current-password'
																{...form.getInputProps('password')}
																// required
																className='block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md'
															/>
														</div>

														<div>
															<label htmlFor='rpassword' className='sr-only'>
																Password Repeated
															</label>
															<input
																// id='rpassword'
																// name='rpassword'
																type='password'
																{...form.getInputProps('rpassword')}
																placeholder='Repeat Password'
																required
																className='block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md'
															/>
														</div>

														<div>
															<button
																type='submit'
																className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
															>
																Create your account
															</button>
														</div>
													</form>
												</div>
											</div>
											<div className='px-4 py-6 bg-gray-50 border-t-2 border-gray-200 sm:px-10'>
												<p className='text-xs leading-5 text-gray-500'>
													By signing up, you agree to our{' '}
													<a
														href='#'
														className='font-medium text-gray-900 hover:underline'
													>
														Terms
													</a>
													,{' '}
													<a
														href='#'
														className='font-medium text-gray-900 hover:underline'
													>
														Data Policy
													</a>{' '}
													and{' '}
													<a
														href='#'
														className='font-medium text-gray-900 hover:underline'
													>
														Cookies Policy
													</a>
													.
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</main>
					</div>
				</div>
			</main>
		</div>
	);
}
