import NewExp, { FormStates } from '../components/NewExp';
import { useAuth } from '../firebase/fbAuth';
import { subscribeToExp, listenToExperiments, downloadExp, downloadExpZip } from '../firebase/db';
import { Fragment, useState, useEffect } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
	CheckBadgeIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	RectangleStackIcon,
	MagnifyingGlassIcon,
	BarsArrowUpIcon,
	QueueListIcon,
} from '@heroicons/react/24/solid';
import { Logo } from '../components/Logo';
import classNames from 'classnames';
import Router from 'next/router';
import Image from 'next/image';
import { setInterval } from 'timers';

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
												<Image
													className='h-8 w-8 rounded-full'
													src={authService.userPhotoUrl}
													alt='User Photo'
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
																			.catch((err) => console.log('Sign out error', err))
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
										item.current ?
											'text-white bg-blue-800' :
											'text-blue-200 hover:text-blue-100 hover:bg-blue-600',
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


const ExpLog = ({ projectinit, setFormState, setCopyId }) => {
	const [project, setProject] = useState(projectinit);
	useEffect(() => subscribeToExp(project.expId, setProject), []); // TODO adding project causes render loop
	const expectedTimeToRun = Math.round(project['estimatedTotalTimeMinutes']*100)/100;
	const totalRuns = project['totalExperimentRuns'] ?? 0;
	const runsLeft = totalRuns - (project['passes'] ?? 0) - (project['fails'] ?? 0);
	const experimentInProgress = !project['finished'] && project['startedAtEpochMillis'];

	return (
		<div className='flex items-center justify-between space-x-4'>
			<div className='min-w-0 space-y-3'>
				<div className='flex items-center space-x-3'>
					<span className='block'>
						<h2 className='text-sm font-medium'>
							{project.name}{' '}
						</h2>
					</span>
				</div>
				{project['finished'] == true ?
					<button type= "button" data-id={project.expId}
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={downloadExp}>
						Download Results
					</button> :
					null
				}
				{project['finished'] == true && (project['trialExtraFile'] || project['scatter'] || project['keepLogs']) ?
					<button type= "button" data-id={project.expId}
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={downloadExpZip}>
						Download Project Zip
					</button> :
					null
				}
				<button type= "button" data-id={project.expId}
					className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
					onClick={() => {
						setFormState(1);
						setCopyId(project.expId);
					}}>
					Copy Experiment
				</button>
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
					{project['finished'] ?
						<span className='font-mono'>Experiment Completed</span> :
						(experimentInProgress ?
							<span className='font-mono text-blue-500'>Experiment In Progress</span> :
							<span className='font-mono text-gray-500'>Experiment Awaiting Start</span>)
					}
				</p>
				{project['finished'] || experimentInProgress ?
					<p className='flex items-center space-x-4'>
						<span className={`font-mono ${project['fails'] ? 'text-red-500' : ''}`}>FAILS: {project['fails'] ?? 0}</span>
						<span className='font-mono'>SUCCESSES: {project['passes'] ?? 0}</span>
					</p> :
					null
				}
				{experimentInProgress ?
					<p>
						{expectedTimeToRun ? `Expected Total Time: ${expectedTimeToRun} Minutes` : '(Calculating estimated runtime...)'}
					</p> :
					null
				}
				{experimentInProgress ?
					(project['totalExperimentRuns'] ?
						<p>{`${runsLeft} run${runsLeft == 1 ? '' : 's'} remain${runsLeft == 1 ? 's' : ''} (of ${project['totalExperimentRuns']})`}</p>:
						<p>(Calculating total experiment runs...)</p>
					) :
					null
				}
				<p className='flex text-gray-500 text-sm space-x-2'>
					<span>Uploaded at {new Date(project['created']).toString()}</span>
					{/* TODO unused location field? */}
					{/* <span>{project.location}</span> */}
				</p>
				{project['startedAtEpochMillis'] ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Started at {new Date(project['startedAtEpochMillis']).toString()}</span>
					</p> :
					null
				}
				{project['finishedAtEpochMillis'] ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Finished at {new Date(project['finishedAtEpochMillis']).toString()}</span>
					</p> :
					null
				}
			</div>
		</div>
	);
};

const SearchBar = (props) => {
	return (
		<div className='flex basis-1/2 justify-center lg:justify-end'>
			<div className='w-full px-2 justify-center place-content-center lg:px-6'>
				<label htmlFor='search' className='sr-only'>
					Search experiments
				</label>
				<div className='relative text-blue-200 focus-within:text-gray-400'>
					<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
						<MagnifyingGlassIcon className='h-5 w-5' aria-hidden='true' />
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

export default function DashboardPage() {
	const { userId, authService } = useAuth();
	const [experiments, setExperiments] = useState([] as unknown[]); // TODO experiment type

	useEffect(() => {
		if (!userId) {
			return;
		}
		return listenToExperiments(userId, (newExperimentList) => setExperiments(newExperimentList));
	}, [userId]);

	const QUEUE_UNKNOWN_LENGTH = -1;
	const QUEUE_ERROR_LENGTH = -2;
	const [queueLength, setQueueLength] = useState(QUEUE_UNKNOWN_LENGTH);

	const queryQueueLength = () => {
		console.log('Querying queue length');
		setQueueLength(QUEUE_UNKNOWN_LENGTH);
		fetch('/api/queue').then((res) => res.json()).then((data) => {
			console.log('Data back is', data);
			const value = data.response.queueSize;
			if (typeof value === 'number') {
				setQueueLength(value);
			} else {
				setQueueLength(QUEUE_ERROR_LENGTH);
			}
		}).catch((err) => {
			console.error('Error fetching queue length', err);
		});
	};

	// const QUEUE_RECHECK_INTERVAL_MS = 4000;
	useEffect(() => {
		queryQueueLength();
		// TODO this seems to cause ghost intervals to be left behind, maybe hot reload's fault?
		// console.log('⏰ Setting up queue length checking timer');
		// const intervalId = setInterval(() => {
		// 	fetch('/api/queue').then((res) => res.json()).then((data) => {
		// 		console.log('Data back is', data);
		// 		setQueueLength(data.response.queueSize);
		// 	}).catch((err) => {
		// 		console.error('Error fetching queue length', err);
		// 	});
		// }, QUEUE_RECHECK_INTERVAL_MS);
		// return () => {
		// 	console.log('⏰ Clearing queue length checking timer');
		// 	clearInterval(intervalId);
		// };
	}, []);


	const [copyID, setCopyId] = useState(null);
	const [formState, setFormState] = useState(FormStates.Closed);
	const [label, setLabel] = useState('New Experiment');
	useEffect(() => {
		if (formState === FormStates.Closed) {
			setLabel('New Experiment');
		} else {
			setLabel('Continue Experiment');
		}
	}, [formState]);
	return (
		<>
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
													<Image
														className='h-12 w-12 rounded-full'
														src={authService.userPhotoUrl}
														alt='User Photo'
													/>
												</div>
												<div className='space-y-1'>
													<div className='text-sm font-medium text-gray-900'>
														{ authService.userEmail }
													</div>
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
												<CheckBadgeIcon
													className='h-5 w-5 text-gray-400'
													aria-hidden='true'
												/>
												<span className='text-sm text-gray-500 font-medium'>
													Verified GLADOSer
												</span>
											</div>
											<div className='flex items-center space-x-2'>
												<RectangleStackIcon
													className='h-5 w-5 text-gray-400'
													aria-hidden='true'
												/>
												<span className='text-sm text-gray-500 font-medium'>
													{experiments?.length} project{experiments?.length == 1 ? '' : 's'}
												</span>
											</div>
											<div className='flex items-center space-x-2'>
												<QueueListIcon
													className='h-5 w-5 text-blue-400'
													aria-hidden='true'
												/>
												<span className={`text-sm text-${queueLength == QUEUE_ERROR_LENGTH ? 'red' : 'blue'}-500 font-medium`}>
													{queueLength == QUEUE_ERROR_LENGTH ?
														'Error - Glados Backend Offline' :
														(queueLength == QUEUE_UNKNOWN_LENGTH) ?
															'Loading...' :
															`${queueLength} experiment${queueLength == 1 ? '' : 's'} in queue`
													}
												</span>
												<button type= "button"
													className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
													onClick={queryQueueLength}>
													TEMP Manual Query
												</button>
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
											<BarsArrowUpIcon
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
																active ?
																	'bg-gray-100 text-gray-900' :
																	'text-gray-700',
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
																active ?
																	'bg-gray-100 text-gray-900' :
																	'text-gray-700',
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
																active ?
																	'bg-gray-100 text-gray-900' :
																	'text-gray-700',
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
								{experiments?.map((project: any) => { // TODO a type for experiments should alleviate the need for `any` here
									return (
										<li
											key={project.expId}
											className='relative pl-4 pr-6 py-5 hover:bg-gray-50 sm:py-6 sm:pl-6 lg:pl-8 xl:pl-6'
										>
											<ExpLog projectinit={project} setFormState={setFormState} setCopyId={setCopyId}/>
										</li>
									);
								})}
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
										<li
											key={`activity_${item.time}_${item.project}_${item.environment}`}
											className='py-4'
										>
											<div className='flex space-x-3'>
												<Image
													className='h-6 w-6 rounded-full'
													src={authService.userPhotoUrl}
													alt='User Photo'
													layout='fixed'
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
						copyID = {copyID}
						setCopyId = {setCopyId}
					/>
				</div>
			</div>
		</>
	);
}
