'use client'

import NewExperiment, { FormStates } from '../components/flows/AddExperiment/NewExperiment';
import { downloadExperimentResults, downloadExperimentProjectZip } from '../../lib/db';
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Disclosure, Menu, Transition } from '@headlessui/react';
import {
	CheckBadgeIcon,
	ChevronDownIcon,
	RectangleStackIcon,
	SwatchIcon,
	QueueListIcon,
	FunnelIcon,
	ArrowUpIcon,
	ArrowDownIcon,
} from '@heroicons/react/24/solid';
import { Logo } from '../components/Logo';
import classNames from 'classnames';
import Image from 'next/image';
import { SearchBar } from '../components/SearchBar';
import { ExperimentListing as ExperimentListing } from '../components/flows/ViewExperiment/ExperimentListing';
import { ExperimentData } from '../../lib/db_types';
import { Toggle } from '../components/Toggle';
import { QueueResponse } from '../../pages/api/queue';
import { deleteDocumentById } from '../../lib/mongodb_funcs';
import { signOut, useSession } from "next-auth/react";
import toast, { Toaster } from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

const REPORT_GOOGLE_FORM_LINK = 'https://docs.google.com/forms/d/1sLjV6x_R8C80mviEcrZv9wiDPe5nOxt47g_pE_7xCyE';
const GLADOS_DOCS_LINK = 'https://automatingsciencepipeline.github.io/Monorepo/tutorial/usage/';

const REPORT_DESCRIPT = 'Report an issue you have encountered to our Google Forms.';
const HELP_DESCRIPT = 'Open the GLADOS docs to learn how to use the application.';

const navigation = [
	{ name: 'Report', href: REPORT_GOOGLE_FORM_LINK, current: false },
	{ name: 'Help', href: GLADOS_DOCS_LINK, current: false }
];
const userNavigation = [
	{ name: 'Your Profile', href: '#' },
	{ name: 'Sign out', href: '#' },
];

enum ExperimentTypes {
	AddNums = 1,
	MultiString = 2,
	GeneticAlgorithm = 3,
}

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
	const { data: session } = useSession();
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
							<SearchBar labelText={'Search experiments'} placeholderText={'Search projects'} onValueChanged={
								function (newValue: string): void {
									console.log(`SearchBar.onValueChanged: ${newValue}`);
								}} />
							{/* Links section */}
							<div className='hidden lg:block lg:w-80'>
								<div className='flex items-center justify-end'>
									<div className='flex'>
										{navigation.map((item) => (
											<a
												key={item.name}
												href={item.href}
												target={['Help', 'Report'].includes(item.name) ? '_blank' : '_self'}
												className='px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white'
												aria-current={item.current ? 'page' : undefined}
												title={
													item.name === 'Help'
														? HELP_DESCRIPT
														: item.name === 'Report'
															? REPORT_DESCRIPT
															: ''
												}
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
												{session?.user?.image ? (
													<Image
														className='h-8 w-8 rounded-full'
														src={session.user.image}
														alt='User Photo'
														width={32} // specify width
														height={32} // specify height
													/>
												) : (
													// Optionally, you could add a placeholder or leave this empty
													<></>
												)}
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
																		signOut()
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
									target={['Help', 'Report'].includes(item.name) ? '_blank' : '_self'}
									className={classNames(
										item.current ?
											'text-white bg-blue-800' :
											'text-blue-200 hover:text-blue-100 hover:bg-blue-600',
										'block px-3 py-2 rounded-md text-base font-medium'
									)}
									aria-current={item.current ? 'page' : undefined}
									title={
										item.name === 'Help'
											? HELP_DESCRIPT
											: item.name === 'Report'
												? REPORT_DESCRIPT
												: ''
									}
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
											return signOut();
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

export default function DashboardPage() {
	const { data: session } = useSession();
	const [experiments, setExperiments] = useState<ExperimentData[]>([] as ExperimentData[]);
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const toastMessage = searchParams!.get('toastMessage');
		const toastType = searchParams!.get('toastType');
		if (toastMessage && toastType) {
			toast[toastType === 'success' ? 'success' : 'error'](decodeURIComponent(toastMessage), { duration: 5000 });

			// Clear the query params
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete('toastMessage');
			newUrl.searchParams.delete('toastType');
			router.replace(newUrl.toString());
		}
	}, [router, searchParams]);

	useEffect(() => {
		if (!session) {
			return;
		}
		const eventSource = new EventSource(`/api/experiments/listen?uid=${session.user?.id}`);

		eventSource.onmessage = (event) => {
			if (event.data !== 'heartbeat') {
				try {
					setExperiments(JSON.parse(event.data) as ExperimentData[]);
				}
				catch {
					console.log(`${event.data} was not valid JSON!`);
				}

			}

		}

		return () => eventSource.close();
	}, [session]);

	const QUEUE_UNKNOWN_LENGTH = -1;
	const QUEUE_ERROR_LENGTH = -2;
	const [queueLength, setQueueLength] = useState(QUEUE_UNKNOWN_LENGTH);

	const queryQueueLength = () => {
		console.log('Querying queue length');
		setQueueLength(QUEUE_UNKNOWN_LENGTH);
		fetch('/api/queue').then((res) => res.json()).then((data: QueueResponse) => {
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


	const [copyID, setCopyId] = useState<string>(null as unknown as string); // TODO refactor copy system to not need this middleman
	const [formState, setFormState] = useState(FormStates.Closed);
	const [label, setLabel] = useState('New Experiment');
	const [isDefault, setIsDefault] = useState(false);
	const [selectedExperimentType, setSelectedExperimentType] = useState<ExperimentTypes | null>(null);

	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleDefaultExperiment = () => {
		setIsModalOpen(true);
	};

	const selectExperiment = (defaultExpNum: ExperimentTypes) => {
		setFormState(FormStates.Params);
		setCopyId("DefaultExp");
		setIsDefault(true);
		setIsModalOpen(false);
		setSelectedExperimentType(defaultExpNum); // Set selected experiment type here
		console.log("IN SELECT EXPERIMENT");
		console.log("experimentTypeNum: ", defaultExpNum);
	};

	useEffect(() => {
		if (formState === FormStates.Closed) {
			setLabel('New Experiment');
		} else {
			setLabel('Continue Experiment');
		}
	}, [formState]);

	return (
		<>
			<Toaster />
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
													{session?.user?.image ? (
														<Image
															className='h-12 w-12 rounded-full'
															src={session.user.image}
															alt='User Photo'
															width={48} // specify width to match h-12
															height={48} // specify height to match w-12
														/>
													) : (
														<></>
													)}

												</div>
												<div className='space-y-1'>
													<div className='text-sm font-medium text-gray-900'>
														{session?.user?.email || ""}
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
												<button type="button"
													className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
													onClick={queryQueueLength}>
													TEMP Manual Query
												</button>
											</div>
											<div className='flex items-center space-x-2'>
												<>
													<button
														type="button"
														className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
														onClick={handleDefaultExperiment}>
														Run a Default Experiment
													</button>
													<Transition appear show={isModalOpen} as={Fragment}>
														<Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
															<Transition.Child
																as={Fragment}
																enter="ease-out duration-300"
																enterFrom="opacity-0"
																enterTo="opacity-100"
																leave="ease-in duration-200"
																leaveFrom="opacity-100"
																leaveTo="opacity-0"
															>
																<div className="fixed inset-0 bg-black bg-opacity-25" />
															</Transition.Child>

															<div className="fixed inset-0 overflow-y-auto">
																<div className="flex min-h-full items-center justify-center p-4 text-center">
																	<Transition.Child
																		as={Fragment}
																		enter="ease-out duration-300"
																		enterFrom="opacity-0 scale-95"
																		enterTo="opacity-100 scale-100"
																		leave="ease-in duration-200"
																		leaveFrom="opacity-100 scale-100"
																		leaveTo="opacity-0 scale-95"
																	>
																		<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
																			<Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
																				Select Default Experiment
																			</Dialog.Title>
																			<div className="mt-2">
																				<p className="text-sm text-gray-500">
																					Please select the type of default experiment you want to run.
																				</p>
																			</div>

																			<div className="mt-4 flex flex-col space-y-2">
																				<button
																					type="button"
																					className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
																					onClick={() => selectExperiment(ExperimentTypes.AddNums)}
																				>
																					Add Nums (Python)
																				</button>
																				<button
																					type="button"
																					className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
																					onClick={() => selectExperiment(ExperimentTypes.MultiString)}
																				>
																					Multistring Testing (Python)
																				</button>
																				<button
																					type="button"
																					className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
																					onClick={() => selectExperiment(ExperimentTypes.GeneticAlgorithm)}
																				>
																					Genetic Algorithm
																				</button>
																			</div>
																		</Dialog.Panel>
																	</Transition.Child>
																</div>
															</div>
														</Dialog>
													</Transition>
													{selectedExperimentType && (
														<NewExperiment
															formState={formState}
															setFormState={setFormState}
															copyID={copyID}
															setCopyId={setCopyId}
															isDefault={isDefault}
															setIsDefault={setIsDefault}
															selectedExperiment={selectedExperimentType}
														/>
													)}
												</>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<ExperimentList
							experiments={experiments}
							onCopyExperiment={(experimentId) => {
								setFormState(FormStates.Params);
								setCopyId(experimentId);
							}}
							onDeleteExperiment={(experimentId) => {
								// deleteExperiment(experimentId);
								deleteDocumentById(experimentId).then(() => {
									toast.success("Deleted experiment!", { duration: 1500 });
								}).catch((reason) => {
									toast.error(`Failed delete, reason: ${reason}`, { duration: 1500 });
									console.log(`Failed delete, reason: ${reason}`);
								});
							}} />
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
												{session?.user?.image ? (
													<Image
														className='h-6 w-6 rounded-full'
														src={session.user.image}
														alt='User Photo'
														layout='fixed'
														width={24} // specify width to match h-6
														height={24} // specify height to match w-6
													/>
												) : (
													<></>
												)}

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
					{!isDefault && (
						<NewExperiment
							formState={formState}
							setFormState={setFormState}
							copyID={copyID}
							setCopyId={setCopyId}
							isDefault={false} // Mark it as regular experiment
							setIsDefault={setIsDefault}
							selectedExperiment={null} // or pass existing experiment for editing
						/>
					)}
				</div>
			</div>
		</>
	);
}

export interface ExperimentListProps {
	experiments: ExperimentData[];
	onCopyExperiment: (experiment: string) => void;
	onDeleteExperiment: (experiment: string) => void;
}

const SortingOptions = {
	NAME: 'name',
	NAME_REVERSE: 'nameReverse',
	DATE_MODIFIED: 'dateModified',
	DATE_MODIFIED_REVERSE: 'dateModifiedReverse',
	DATE_CREATED: 'dateCreated',
	DATE_CREATED_REVERSE: 'dateCreatedReverse',
};

const ExperimentList = ({ experiments, onCopyExperiment, onDeleteExperiment }: ExperimentListProps) => {
	// Initial sorting option
	const [sortBy, setSortBy] = useState(SortingOptions.DATE_CREATED);
	const [sortedExperiments, setSortedExperiments] = useState([...experiments]);

	// State of arrow icon
	const [sortArrowUp, setSortArrowUp] = useState(true);

	const [selectedSortText, setSelectedSortText] = useState('Date Modified');

	const [searchTerm, setSearchTerm] = useState('');

	// Sorting functions
	const sortByName = (a, b) => {
		return sortByExperimentState(a, b, b.name.localeCompare(a.name));
	};
	const sortByNameReverse = (a, b) => {
		return sortByExperimentState(a, b, a.name.localeCompare(b.name));
	};
	const sortByDateModified = (a, b) => {
		return sortByExperimentState(a, b, b.finishedAtEpochMillis - a.finishedAtEpochMillis);
	};
	const sortByDateModifiedReverse = (a, b) => {
		return sortByExperimentState(a, b, a.finishedAtEpochMillis - b.finishedAtEpochMillis);
	};
	const sortByDateCreated = (a, b) => {
		return sortByExperimentState(a, b, b.startedAtEpochMillis - a.startedAtEpochMillis);
	};
	const sortByDateCreatedReverse = (a, b) => {
		return sortByExperimentState(a, b, a.startedAtEpochMillis - b.startedAtEpochMillis);
	};

	const getExperimentState = (exp) => {
		if (exp.finished) {
			return exp.fails <= 1 && (exp?.passes ?? 0) === 0 ? 'Aborted' : 'Completed';
		}
		if (!exp.finished && exp.startedAtEpochMillis) {
			return 'In Progress';
		}
		return 'Awaiting Start';
	};

	const sortByExperimentState = (a, b, sort) => {
		const aStatus = getExperimentState(a);
		const bStatus = getExperimentState(b);

		// Define priority order for sorting
		const statusOrder = {
			'Awaiting Start': 1,
			'In Progress': 2,
			'Completed': 3,
			'Aborted': 4
		};

		if (statusOrder[aStatus] < statusOrder[bStatus]) return -1;
		if (statusOrder[aStatus] > statusOrder[bStatus]) return 1;

		return sort;
	};

	// Sort the experiments based on the selected sorting option
	useEffect(() => {
		switch (sortBy) {
			case SortingOptions.NAME:
				setSortedExperiments([...experiments].sort(sortByName));
				break;

			case SortingOptions.NAME_REVERSE:
				setSortedExperiments([...experiments].sort(sortByNameReverse));
				break;

			case SortingOptions.DATE_MODIFIED:
				setSortedExperiments([...experiments].sort(sortByDateModified));
				break;

			case SortingOptions.DATE_MODIFIED_REVERSE:
				setSortedExperiments([...experiments].sort(sortByDateModifiedReverse));
				break;

			case SortingOptions.DATE_CREATED:
				setSortedExperiments([...experiments].sort(sortByDateCreated));
				break;

			case SortingOptions.DATE_CREATED_REVERSE:
				setSortedExperiments([...experiments].sort(sortByDateCreatedReverse));
				break;

			default:
				break;
		}
	}, [sortBy, experiments]);

	// Toggle the arrow icon state when the user clicks the button
	const toggleSortOrder = (sortBy) => {
		// Determine the new sorting option based on the current state
		let newSortBy;

		console.log('in toggle order: ', { sortBy });

		switch (sortBy) {
			case SortingOptions.NAME:
				newSortBy = SortingOptions.NAME_REVERSE;
				break;
			case SortingOptions.NAME_REVERSE:
				newSortBy = SortingOptions.NAME;
				break;
			case SortingOptions.DATE_MODIFIED:
				newSortBy = SortingOptions.DATE_MODIFIED_REVERSE;
				break;
			case SortingOptions.DATE_MODIFIED_REVERSE:
				newSortBy = SortingOptions.DATE_MODIFIED;
				break;
			case SortingOptions.DATE_CREATED:
				newSortBy = SortingOptions.DATE_CREATED_REVERSE;
				break;
			case SortingOptions.DATE_CREATED_REVERSE:
				newSortBy = SortingOptions.DATE_CREATED;
				break;
			default:
				newSortBy = SortingOptions.DATE_MODIFIED; // Default sorting option
				break;
		}

		console.log('in toggle order new sort: ', { newSortBy });

		//setSortBy(newSortBy);
		handleSortChange(newSortBy);
	};

	const displaySortOrder = (sortBy) => {
		// Determine the new sorting option based on the current state
		let newSortBy;

		switch (sortBy) {
			case SortingOptions.NAME:
				newSortBy = sortArrowUp ? SortingOptions.NAME_REVERSE : SortingOptions.NAME;
				break;
			case SortingOptions.NAME_REVERSE:
				newSortBy = sortArrowUp ? SortingOptions.NAME : SortingOptions.NAME_REVERSE;
				break;
			case SortingOptions.DATE_MODIFIED:
				newSortBy = sortArrowUp ? SortingOptions.DATE_MODIFIED_REVERSE : SortingOptions.DATE_MODIFIED;
				break;
			case SortingOptions.DATE_MODIFIED_REVERSE:
				newSortBy = sortArrowUp ? SortingOptions.DATE_MODIFIED : SortingOptions.DATE_MODIFIED_REVERSE;
				break;
			case SortingOptions.DATE_CREATED:
				newSortBy = sortArrowUp ? SortingOptions.DATE_CREATED_REVERSE : SortingOptions.DATE_CREATED;
				break;
			case SortingOptions.DATE_CREATED_REVERSE:
				newSortBy = sortArrowUp ? SortingOptions.DATE_CREATED : SortingOptions.DATE_CREATED_REVERSE;
				break;
			default:
				newSortBy = SortingOptions.DATE_MODIFIED; // Default sorting option
				break;
		}

		handleSortChange(newSortBy);
	};

	// Handle displaying sorting option

	// Handle sorting option change
	const handleSortChange = (newSortBy) => {
		setSortBy(newSortBy);
		console.log(`in handleSortChange param: ${newSortBy}`);
		console.log(`in handleSortChange: ${newSortBy}`);
		handleDisplaySortingOptions(newSortBy);
	};

	const handleDisplaySortingOptions = (newSortBy) => {
		let sortingOption;

		console.log(`in display SortChange: ${newSortBy}`);

		if (newSortBy == SortingOptions.NAME || newSortBy == SortingOptions.NAME_REVERSE) {
			sortingOption = 'Name';
		} else if (newSortBy == SortingOptions.DATE_CREATED || newSortBy == SortingOptions.DATE_CREATED_REVERSE) {
			sortingOption = 'Date Created';
		} else if (newSortBy == SortingOptions.DATE_MODIFIED || newSortBy == SortingOptions.DATE_MODIFIED_REVERSE) {
			sortingOption = 'Date Modified';
		}

		console.log(`in display SortChange text: ${sortingOption}`);

		setSelectedSortText(sortingOption);
	};

	const menuHoverActiveCss = (active: boolean) => {
		return classNames(
			active ?
				'bg-gray-100 text-gray-900' :
				'text-gray-700',
			'block px-4 py-2 text-sm'
		);
	};

	const [includeCompleted, setIncludeCompleted] = useState(true);
	const [includeArchived, setIncludeArchived] = useState(true);

	return (<div className='bg-white lg:min-w-0 lg:flex-1'>
		<div className='pl-4 pr-6 pt-4 pb-4 border-b border-t border-gray-200 sm:pl-6 lg:pl-8 xl:pl-6 xl:pt-6 xl:border-t-0'>
			<div className='flex items-center'>
				<h1 className='flex-1 text-lg font-medium'>Projects</h1>
				<SearchBar
					labelText={'Search experiments'}
					placeholderText={'Search projects'}
					onValueChanged={(newValue) => {
						setSearchTerm(newValue);
					}}
				/>
				<div
					className="cursor-pointer"
					style={{ padding: '0.5rem' }}
					onClick={() => {
						setSortArrowUp((sortArrowUp) => !sortArrowUp);
						toggleSortOrder(sortBy);
					}}>
					{sortArrowUp ? (
						<ArrowUpIcon className="h-5 w-5 text-gray-400" />
					) : (
						<ArrowDownIcon className="h-5 w-5 text-gray-400" />
					)}
				</div>
				<Menu as='div' className='relative'>
					<Menu.Button className='w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
						<SwatchIcon
							className='mr-3 h-5 w-5 text-gray-400'
							aria-hidden='true' />
						Sort by {selectedSortText}
						<ChevronDownIcon
							className='ml-2.5 -mr-1.5 h-5 w-5 text-gray-400'
							aria-hidden='true' />
					</Menu.Button>
					<Menu.Items className='origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'>
						<div className='py-1'>
							<Menu.Item>
								{({ active }) => (
									<a
										href="#"
										className={menuHoverActiveCss(active)}
										onClick={() => displaySortOrder(SortingOptions.NAME)}
									>
										Name
									</a>
								)}
							</Menu.Item>
							<Menu.Item>
								{({ active }) => (
									<a
										href="#"
										className={menuHoverActiveCss(active)}
										onClick={() => displaySortOrder(SortingOptions.DATE_MODIFIED)}
									>
										Date modified
									</a>
								)}
							</Menu.Item>
							<Menu.Item>
								{({ active }) => (
									<a
										href="#"
										className={menuHoverActiveCss(active)}
										onClick={() => displaySortOrder(SortingOptions.DATE_CREATED)}
									>
										Date created
									</a>
								)}
							</Menu.Item>
						</div>
					</Menu.Items>
				</Menu>
				<Menu as='div' className='relative' style={{ marginLeft: '0.5rem' }}>
					<Menu.Button className='w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
						<FunnelIcon
							className='mr-3 h-5 w-5 text-gray-400'
							aria-hidden='true' />Filter
						<ChevronDownIcon
							className='ml-2.5 -mr-1.5 h-5 w-5 text-gray-400'
							aria-hidden='true' />
					</Menu.Button>
					<Menu.Items className='origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'>
						<div className='py-1'>
							<Menu.Item>
								{({ active }) => (
									<div className={menuHoverActiveCss(active)}>
										<Toggle
											label={'Include Completed'}
											initialValue={includeCompleted}
											onChange={(newValue) => {
												setIncludeCompleted(newValue);
											}} />
									</div>
								)}
							</Menu.Item>
							<Menu.Item>
								{({ active }) => (
									<a href='#' className={menuHoverActiveCss(active)}>
										<Toggle
											label={'Include Archived'}
											initialValue={includeArchived}
											onChange={(newValue) => {
												setIncludeArchived(newValue);
											}} />
									</a>
								)}
							</Menu.Item>
							<Menu.Item>
								{({ active }) => (
									<a href='#' className={menuHoverActiveCss(active)}>
										TODO AnotherOption
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

			{sortedExperiments
				.filter((project) => {
					if (searchTerm.trim() === '') {
						return true;
					}
					return project.name.toLowerCase().includes(searchTerm.toLowerCase());
				})
				.map((project: ExperimentData) => {
					if (!includeCompleted && project.finished) {
						return null;
					}
					const projectFinishedDate = new Date(project['finishedAtEpochMillis'] || 0);
					const oneHourMilliseconds = 1000 * 60 * 60;
					const twoWeeksMilliseconds = oneHourMilliseconds * 24 * 14;
					const projectIsArchived = projectFinishedDate.getTime() + twoWeeksMilliseconds < Date.now();
					if (!includeArchived && projectIsArchived) {
						return null;
					}
					return (
						<li
							key={project.expId}
							className='relative pl-4 pr-6 py-5 hover:bg-gray-50 sm:py-6 sm:pl-6 lg:pl-8 xl:pl-6'
						>
							<ExperimentListing
								projectData={project}
								onCopyExperiment={onCopyExperiment}
								onDownloadResults={downloadExperimentResults}
								onDownloadProjectZip={downloadExperimentProjectZip}
								onDeleteExperiment={onDeleteExperiment}
							/>
						</li>
					);
				})}
		</ul>
	</div>);
};

