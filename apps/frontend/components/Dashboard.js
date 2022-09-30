import NewExp from './NewExp';
import { useAuth } from '../supabase/auth';
import { subscribeToExp, listenToNew } from '../supabase/db';
import { Fragment, useState, useEffect } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import Link from 'next/link';
import {
	BadgeCheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CollectionIcon,
	SearchIcon,
	SortAscendingIcon,
	StarIcon,
} from '@heroicons/react/solid';
import { MenuAlt1Icon, XIcon } from '@heroicons/react/outline';
import { Logo } from './utils';
import classNames from 'classnames';

const navigation = [{ name: 'Admin', href: '#', current: false }];
const userNavigation = [
	{ name: 'Your Profile', href: '#' },
	{ name: 'Sign out', href: '#' },
];
const projects = [
	{
		name: 'SwarmNeuralNetwork',
		href: '#',
		siteHref: '#',
		repoHref: '#',
		repo: 'derelictions/mialupia',
		tech: 'PyTorch',
		lastDeploy: '3h ago',
		location: 'United states',
		starred: true,
		active: true,
	},
];
const activityItems = [
	{
		project: 'SwarmNeuralNetwork',
		environment: '__rh_PROD_hintonD',
		time: '3h',
	},
];

const selfie =
	'https://lh3.googleusercontent.com/pw/AM-JKLUSYx9ZrBlRQR-WboUMFL8kirp80evrurmoriQgWZSuQt2OvJUqm9_4zwjLqcc3ZfAIrG5mbgO7I_CVs0eqqZ5rlnLb3s8gkaKik79qpZz04N4PefGWq-q_ICueUP8XznvHxK71e-3SmQM8882Wi_57jw=w744-h1488-no?authuser=0';

const Navbar = (props) => {
	const { authService } = useAuth();
	return (
		<Disclosure as='nav' className='flex-shrink-0 bg-blue-600'>
			{({ open }) => (
				<>
					<div className='mx-auto px-2 sm:px-4 lg:px-8'>
						<div className='relative flex items-center justify-between h-16'>
							{/* Logo section */}
							<div className='flex items-center px-2 lg:px-0 xl:w-64'>
								<div className='flex-shrink-0'>
									<Logo />
								</div>
							</div>

							<SearchBar />

							{/* <div className='flex lg:hidden'>
								<Disclosure.Button className='bg-blue-600 inline-flex items-center justify-center p-2 rounded-md text-blue-400 hover:text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white'>
									<span className='sr-only'>Open main menu</span>
									{open ? (
										<XIcon className='block h-6 w-6' aria-hidden='true' />
									) : (
										<MenuAlt1Icon
											className='block h-6 w-6'
											aria-hidden='true'
										/>
									)}
								</Disclosure.Button>
							</div> */}
							{/* Links section */}
							<div className='hidden lg:block lg:w-80'>
								<div className='flex items-center justify-end'>
									<div className='flex'>
										{navigation.map((item) => (
											<a
												key={item.name}
												href={item.href}
												className='px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white'
												aria-current={item.current ? 'page' : undefined}
											>
												{item.name}
											</a>
										))}
									</div>
									{/* Profile dropdown */}
									<Menu as='div' className='ml-4 relative flex-shrink-0'>
										<div>
											<Menu.Button className='bg-blue-700 flex text-sm rounded-full text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-700 focus:ring-white'>
												<span className='sr-only'>Open user menu</span>
												<img
													className='h-8 w-8 rounded-full'
													src={selfie}
													alt=''
												/>
											</Menu.Button>
										</div>
										<Transition
											as={Fragment}
											enter='transition ease-out duration-100'
											enterFrom='transform opacity-0 scale-95'
											enterTo='transform opacity-100 scale-100'
											leave='transition ease-in duration-75'
											leaveFrom='transform opacity-100 scale-100'
											leaveTo='transform opacity-0 scale-95'
										>
											<Menu.Items className='origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'>
												{userNavigation.map((item) => (
													<Menu.Item key={item.name}>
														{({ active }) => (
															<a
																href={item.href}
																onClick={() => {
																	return (
																		item.name === 'Sign out' &&
																		authService
																			.signOut()
																			.catch((err) => console.log(err))
																	);
																}}
																className={classNames(
																	active ? 'bg-gray-100' : '',
																	'block px-4 py-2 text-sm text-gray-700'
																)}
															>
																{item.name}
															</a>
														)}
													</Menu.Item>
												))}
											</Menu.Items>
										</Transition>
									</Menu>
								</div>
							</div>
						</div>
					</div>

					<Disclosure.Panel className='lg:hidden'>
						<div className='px-2 pt-2 pb-3 space-y-1'>
							{navigation.map((item) => (
								<Disclosure.Button
									key={item.name}
									as='a'
									href={item.href}
									className={classNames(
										item.current
											? 'text-white bg-blue-800'
											: 'text-blue-200 hover:text-blue-100 hover:bg-blue-600',
										'block px-3 py-2 rounded-md text-base font-medium'
									)}
									aria-current={item.current ? 'page' : undefined}
								>
									{item.name}
								</Disclosure.Button>
							))}
						</div>
						<div className='pt-4 pb-3 border-t border-blue-800'>
							<div className='px-2 space-y-1'>
								{userNavigation.map((item) => (
									<Disclosure.Button
										key={item.name}
										as='a'
										onClick={() => {
											return authService.signOut();
										}}
										href={item.href}
										className='block px-3 py-2 rounded-md text-base font-medium text-blue-200 hover:text-blue-100 hover:bg-blue-600'
									>
										{item.name}
									</Disclosure.Button>
								))}
							</div>
						</div>
					</Disclosure.Panel>
				</>
			)}
		</Disclosure>
	);
};


const ExpLog = ({projectinit, uid}) => {
    
    const [project, setProject] = useState(projectinit);
    subscribeToExp(project.id, uid, setProject)
    return (
						<div className='flex items-center justify-between space-x-4'>
							<div className='min-w-0 space-y-3'>
								<div className='flex items-center space-x-3'>
									<span
										className={classNames(
											 `bg-${{COMPLETE: 'gray', QUEUED: 'yellow', DISPATCHED: 'blue', RUNNING: 'green'}[project['status']]}-100`, 
											'h-4 w-4 rounded-full flex items-center justify-center'
										)}
										aria-hidden='true'
									>
										<span
											className={classNames(
												 `bg-${{COMPLETE: 'gray', QUEUED: 'yellow', DISPATCHED: 'blue', RUNNING: 'green'}[project['status']]}-400`,
												'h-2 w-2 rounded-full'
											)}
										/>
									</span>

									<span className='block'>
										<h2 className='text-sm font-medium'>
											<a href={project.href}>
												<span
													className='absolute inset-0'
													aria-hidden='true'
												/>
												{project.name}{' '}
												<span className='sr-only'>
													{project.status !== 'COMPLETE' ? 'Running' : 'Not running'}
												</span>
											</a>
										</h2>
									</span>
								</div>
								<a
									href={project.repoHref}
									className='relative group flex items-center space-x-2.5'
								>
									<span className='text-sm text-gray-500 group-hover:text-gray-900 font-medium truncate'>
										{project.description}
									</span>
								</a>
							</div>
							<div className='sm:hidden'>
								<ChevronRightIcon
									className='h-5 w-5 text-gray-400'
									aria-hidden='true'
								/>
							</div>
							<div className='hidden sm:flex flex-col flex-shrink-0 items-end space-y-3'>
								<p className='flex items-center space-x-4'>    
									<span className='font-mono text-red-500'>FAIL: {project.percent_fail}</span>
									<span className='font-mono'>SUCCESS: {project.percent_success}</span>
								</p>
								<p className='flex text-gray-500 text-sm space-x-2'>
									<span>Deployed {new Date(project.created_at).toUTCString()}</span>
									<span>{project.location}</span>
								</p>
							</div>
						</div> 
    )
}

const SearchBar = (props) => {
	return (
		<div className='flex basis-1/2 justify-center lg:justify-end'>
			<div className='w-full px-2 justify-center place-content-center lg:px-6'>
				<label htmlFor='search' className='sr-only'>
					Search experiments
				</label>
				<div className='relative text-blue-200 focus-within:text-gray-400'>
					<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
						<SearchIcon className='h-5 w-5' aria-hidden='true' />
					</div>
					<input
						id='search'
						name='search'
						className='block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-blue-400 bg-opacity-25 text-blue-100 placeholder-blue-200 focus:outline-none focus:bg-white focus:ring-0 focus:placeholder-gray-400 focus:text-gray-900 sm:text-sm'
						placeholder='Search projects'
						type='search'
					/>
				</div>
			</div>
		</div>
	);
};




export default function Dashboard({ user, experimentss }) {
    const [experiments, setExperiments] = useState(experimentss);

    listenToNew((payload)=> setExperiments([...experiments, payload]))

	const [formState, setFormState] = useState(-1);
	const [label, setLabel] = useState('New Experiment');
	useEffect(() => {
		if (formState === -1) {
			setLabel('New Experiment');
		} else {
			setLabel('Continue Experiment');
		}
	}, [formState]);
	return (
		<>
			{/*
			{/* Background color split screen for large screens */}
			<div
				className='fixed top-0 left-0 w-1/2 h-full bg-white'
				aria-hidden='true'
			/>
			<div
				className='fixed top-0 right-0 w-1/2 h-full bg-gray-50'
				aria-hidden='true'
			/>
			<div className='relative min-h-full min-w-full flex flex-col'>
				{/* Navbar */}
				<Navbar />

				{/* 3 column wrapper */}
				<div className='flex-grow w-full mx-auto xl:px-8 lg:flex'>
					{/* Left sidebar & main wrapper */}
					<div className='flex-1 min-w-0 bg-white xl:flex'>
						{/* Account profile */}
						<div className='xl:flex-shrink-0 xl:w-64 xl:border-r xl:border-gray-200 bg-white'>
							<div className='pl-4 pr-6 py-6 sm:pl-6 lg:pl-8 xl:pl-0'>
								<div className='flex items-center justify-between'>
									<div className='flex-1 space-y-8'>
										<div className='space-y-8 sm:space-y-0 sm:flex sm:justify-between sm:items-center xl:block xl:space-y-8'>
											{/* Profile */}
											<div className='flex items-center space-x-3'>
												<div className='flex-shrink-0 h-12 w-12'>
													<img
														className='h-12 w-12 rounded-full'
														src={selfie}
														alt=''
													/>
												</div>
												<div className='space-y-1'>
													<div className='text-sm font-medium text-gray-900'>
														{user.email}
														{/* Omar Fayoumi */}
													</div>
													{/* <a
														href='#'
														className='group flex items-center space-x-2.5'
													>
														<svg
															className='h-5 w-5 text-gray-400 group-hover:text-gray-500'
															aria-hidden='true'
															fill='currentColor'
															viewBox='0 0 20 20'
														>
															<path
																fillRule='evenodd'
																d='M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z'
																clipRule='evenodd'
															/>
														</svg>
														<span className='text-sm text-gray-500 group-hover:text-gray-900 font-medium'>
															derelections
														</span>
													</a> */}
												</div>
											</div>
											{/* Action buttons */}
											<div className='flex flex-col sm:flex-row xl:flex-col'>
												<button
													type='button'
													className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
													onClick={() => {
														setFormState(1);
													}}
													// onClick
												>
													{label}
												</button>
												<button
													type='button'
													className='mt-3 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 xl:ml-0 xl:mt-3 xl:w-full'
												>
													Invite Team
												</button>
											</div>
										</div>
										{/* Meta info */}
										<div className='flex flex-col space-y-6 sm:flex-row sm:space-y-0 sm:space-x-8 xl:flex-col xl:space-x-0 xl:space-y-6'>
											<div className='flex items-center space-x-2'>
												<BadgeCheckIcon
													className='h-5 w-5 text-gray-400'
													aria-hidden='true'
												/>
												<span className='text-sm text-gray-500 font-medium'>
													Verified GLADOSer
												</span>
											</div>
											<div className='flex items-center space-x-2'>
												<CollectionIcon
													className='h-5 w-5 text-gray-400'
													aria-hidden='true'
												/>
												<span className='text-sm text-gray-500 font-medium'>
													{experiments.length} project
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Projects List */}
						<div className='bg-white lg:min-w-0 lg:flex-1'>
							<div className='pl-4 pr-6 pt-4 pb-4 border-b border-t border-gray-200 sm:pl-6 lg:pl-8 xl:pl-6 xl:pt-6 xl:border-t-0'>
								<div className='flex items-center'>
									<h1 className='flex-1 text-lg font-medium'>Projects</h1>
									<Menu as='div' className='relative'>
										<Menu.Button className='w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
											<SortAscendingIcon
												className='mr-3 h-5 w-5 text-gray-400'
												aria-hidden='true'
											/>
											Sort
											<ChevronDownIcon
												className='ml-2.5 -mr-1.5 h-5 w-5 text-gray-400'
												aria-hidden='true'
											/>
										</Menu.Button>
										<Menu.Items className='origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'>
											<div className='py-1'>
												<Menu.Item>
													{({ active }) => (
														<a
															href='#'
															className={classNames(
																active
																	? 'bg-gray-100 text-gray-900'
																	: 'text-gray-700',
																'block px-4 py-2 text-sm'
															)}
														>
															Name
														</a>
													)}
												</Menu.Item>
												<Menu.Item>
													{({ active }) => (
														<a
															href='#'
															className={classNames(
																active
																	? 'bg-gray-100 text-gray-900'
																	: 'text-gray-700',
																'block px-4 py-2 text-sm'
															)}
														>
															Date modified
														</a>
													)}
												</Menu.Item>
												<Menu.Item>
													{({ active }) => (
														<a
															href='#'
															className={classNames(
																active
																	? 'bg-gray-100 text-gray-900'
																	: 'text-gray-700',
																'block px-4 py-2 text-sm'
															)}
														>
															Date created
														</a>
													)}
												</Menu.Item>
											</div>
										</Menu.Items>
									</Menu>
								</div>
							</div>
							<ul
								role='list'
								className='relative z-0 divide-y divide-gray-200 border-b border-gray-200'
							>
								{experiments.map((project) => (
									<li
										key={project.id}
										className='relative pl-4 pr-6 py-5 hover:bg-gray-50 sm:py-6 sm:pl-6 lg:pl-8 xl:pl-6'
									>
                                        <ExpLog projectinit={project}/>
										{/* <div className='flex items-center justify-between space-x-4'>
											<div className='min-w-0 space-y-3'>
												<div className='flex items-center space-x-3'>
													<span
														className={classNames(
															 `bg-${{COMPLETE: 'gray', QUEUED: 'yellow', DISPATCHED: 'blue', RUNNING: 'green'}[project.status]}-100`, 
															'h-4 w-4 rounded-full flex items-center justify-center'
														)}
														aria-hidden='true'
													>
														<span
															className={classNames(
																 `bg-${{COMPLETE: 'gray', QUEUED: 'yellow', DISPATCHED: 'blue', RUNNING: 'green'}[project.status]}-400`,
																'h-2 w-2 rounded-full'
															)}
														/>
													</span>

													<span className='block'>
														<h2 className='text-sm font-medium'>
															<a href={project.href}>
																<span
																	className='absolute inset-0'
																	aria-hidden='true'
																/>
																{project.name}{' '}
																<span className='sr-only'>
																	{project.status !== 'COMPLETE' ? 'Running' : 'Not running'}
																</span>
															</a>
														</h2>
													</span>
												</div>
												<a
													href={project.repoHref}
													className='relative group flex items-center space-x-2.5'
												>
													<span className='text-sm text-gray-500 group-hover:text-gray-900 font-medium truncate'>
														{project.description}
													</span>
												</a>
											</div>
											<div className='sm:hidden'>
												<ChevronRightIcon
													className='h-5 w-5 text-gray-400'
													aria-hidden='true'
												/>
											</div>
											<div className='hidden sm:flex flex-col flex-shrink-0 items-end space-y-3'>
												<p className='flex items-center space-x-4'>
             
													<span className='font-mono text-red-500'>FAIL: {project.percent_fail}</span>
													<span className='font-mono'>SUCCESS: {project.percent_success}</span>
												</p>
												<p className='flex text-gray-500 text-sm space-x-2'>
													<span>Deployed {new Date(project.created_at).toUTCString()}</span>
													<span>{project.location}</span>
												</p>
											</div>
										</div> */}
									</li>
								))}
								{/* {projects.map((project) => (
									<li
										key={project.repo}
										className='relative pl-4 pr-6 py-5 hover:bg-gray-50 sm:py-6 sm:pl-6 lg:pl-8 xl:pl-6'
									>
										<div className='flex items-center justify-between space-x-4'>
											<div className='min-w-0 space-y-3'>
												<div className='flex items-center space-x-3'>
													<span
														className={classNames(
															project.active ? 'bg-green-100' : 'bg-gray-100',
															'h-4 w-4 rounded-full flex items-center justify-center'
														)}
														aria-hidden='true'
													>
														<span
															className={classNames(
																project.active ? 'bg-green-400' : 'bg-gray-400',
																'h-2 w-2 rounded-full'
															)}
														/>
													</span>

													<span className='block'>
														<h2 className='text-sm font-medium'>
															<a href={project.href}>
																<span
																	className='absolute inset-0'
																	aria-hidden='true'
																/>
																{project.name}{' '}
																<span className='sr-only'>
																	{project.active ? 'Running' : 'Not running'}
																</span>
															</a>
														</h2>
													</span>
												</div>
												<a
													href={project.repoHref}
													className='relative group flex items-center space-x-2.5'
												>
													<svg
														className='flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-gray-500'
														viewBox='0 0 18 18'
														fill='none'
														xmlns='http://www.w3.org/2000/svg'
														aria-hidden='true'
													>
														<path
															fillRule='evenodd'
															clipRule='evenodd'
															d='M8.99917 0C4.02996 0 0 4.02545 0 8.99143C0 12.9639 2.57853 16.3336 6.15489 17.5225C6.60518 17.6053 6.76927 17.3277 6.76927 17.0892C6.76927 16.8762 6.76153 16.3104 6.75711 15.5603C4.25372 16.1034 3.72553 14.3548 3.72553 14.3548C3.31612 13.316 2.72605 13.0395 2.72605 13.0395C1.9089 12.482 2.78793 12.4931 2.78793 12.4931C3.69127 12.5565 4.16643 13.4198 4.16643 13.4198C4.96921 14.7936 6.27312 14.3968 6.78584 14.1666C6.86761 13.5859 7.10022 13.1896 7.35713 12.965C5.35873 12.7381 3.25756 11.9665 3.25756 8.52116C3.25756 7.53978 3.6084 6.73667 4.18411 6.10854C4.09129 5.88114 3.78244 4.96654 4.27251 3.72904C4.27251 3.72904 5.02778 3.48728 6.74717 4.65082C7.46487 4.45101 8.23506 4.35165 9.00028 4.34779C9.76494 4.35165 10.5346 4.45101 11.2534 4.65082C12.9717 3.48728 13.7258 3.72904 13.7258 3.72904C14.217 4.96654 13.9082 5.88114 13.8159 6.10854C14.3927 6.73667 14.7408 7.53978 14.7408 8.52116C14.7408 11.9753 12.6363 12.7354 10.6318 12.9578C10.9545 13.2355 11.2423 13.7841 11.2423 14.6231C11.2423 15.8247 11.2313 16.7945 11.2313 17.0892C11.2313 17.3299 11.3937 17.6097 11.8501 17.522C15.4237 16.3303 18 12.9628 18 8.99143C18 4.02545 13.97 0 8.99917 0Z'
															fill='currentcolor'
														/>
													</svg>
													<span className='text-sm text-gray-500 group-hover:text-gray-900 font-medium truncate'>
														{project.repo}
													</span>
												</a>
											</div>
											<div className='sm:hidden'>
												<ChevronRightIcon
													className='h-5 w-5 text-gray-400'
													aria-hidden='true'
												/>
											</div>
											<div className='hidden sm:flex flex-col flex-shrink-0 items-end space-y-3'>
												<p className='flex items-center space-x-4'>
													<button
														type='button'
														className='relative bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
													>
														<span className='sr-only'>
															{project.starred
																? 'Add to favorites'
																: 'Remove from favorites'}
														</span>
														<StarIcon
															className={classNames(
																project.starred
																	? 'text-yellow-300 hover:text-yellow-400'
																	: 'text-gray-300 hover:text-gray-400',
																'h-5 w-5'
															)}
															aria-hidden='true'
														/>
													</button>
												</p>
												<p className='flex text-gray-500 text-sm space-x-2'>
													<span className='font-mono'>{project.tech}</span>
													<span aria-hidden='true'>&middot;</span>
													<span>Last deploy {project.lastDeploy}</span>
													<span aria-hidden='true'>&middot;</span>
													<span>{project.location}</span>
												</p>
											</div>
										</div>
									</li>
								))} */}
							</ul>
						</div>
					</div>
					{/* Activity feed */}
					<div className='bg-gray-50 pr-4 sm:pr-6 lg:pr-8 lg:flex-shrink-0 lg:border-l lg:border-gray-200 xl:pr-0'>
						<div className='pl-6 lg:w-80'>
							<div className='pt-6 pb-2'>
								<h2 className='text-sm font-semibold'>Activity</h2>
							</div>
							<div>
								<ul role='list' className='divide-y divide-gray-200'>
									{activityItems.map((item) => (
										<li key={item.commit} className='py-4'>
											<div className='flex space-x-3'>
												<img
													className='h-6 w-6 rounded-full'
													src={selfie}
													alt=''
												/>
												<div className='flex-1 space-y-1'>
													<div className='flex items-center justify-between'>
														<h3 className='text-sm font-medium'>You</h3>
														<p className='text-sm text-gray-500'>{item.time}</p>
													</div>
													<p className='text-sm text-gray-500'>
														Deployed {item.project} {item.environment}
													</p>
												</div>
											</div>
										</li>
									))}
								</ul>
								<div className='py-4 text-sm border-t border-gray-200'>
									<a
										href='#'
										className='text-blue-600 font-semibold hover:text-blue-900'
									>
										View all activity <span aria-hidden='true'>&rarr;</span>
									</a>
								</div>
							</div>
						</div>
					</div>
					<NewExp
						formState={formState}
						setFormState={setFormState}
						user={user}
					/>
				</div>
			</div>
		</>
	);
}
