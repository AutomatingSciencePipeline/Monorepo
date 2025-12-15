/* eslint-disable no-mixed-spaces-and-tabs */
import { useEffect, useState } from 'react';
import { ExperimentData } from '../../../../lib/db_types';
import { MdEdit } from 'react-icons/md';
import Chart from './Chart';
import { addShareLink, unfollowExperiment, updateExperimentNameById, cancelExperimentById, updateExperimentArchiveStatusById } from '../../../../lib/mongodb_funcs';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { CheckIcon, ChevronRightIcon, ShareIcon, FolderArrowDownIcon, DocumentDuplicateIcon, ChartBarIcon, XMarkIcon, MinusIcon, ExclamationTriangleIcon, DocumentCheckIcon, ChevronDownIcon, ArchiveBoxIcon, BookOpenIcon } from '@heroicons/react/24/solid';
import { Minus } from 'tabler-icons-react';
import {ReadOnlyTag} from '../../ReadOnlyTag'
export interface ExperimentListingProps {
	projectData: ExperimentData;
	onCopyExperiment: (experimentId: string) => void;
	onDownloadResults: (experimentId: string) => Promise<void>;
	onDownloadProjectZip: (experimentId: string) => Promise<void>;
	onDeleteExperiment: (experimentId: string) => void;
	multiSelectMode: boolean; // New prop for multi-select mode
	selectedExperiments: string[]; // New prop for selected experiments
	setSelectedExperiments: React.Dispatch<React.SetStateAction<string[]>>; // Setter for selected experiments
	experimentStates: any; // New prop for experiment states
	setExperimentStates: React.Dispatch<React.SetStateAction<any>>; // Setter for experiment states
	isChecked: boolean;
	handleCheckboxChange: (experimentId: string, isChecked: boolean) => void;
}


export const ExperimentListing = ({ projectData: projectData, onCopyExperiment, onDownloadResults, onDownloadProjectZip, onDeleteExperiment, multiSelectMode, experimentStates, setExperimentStates, selectedExperiments, setSelectedExperiments, isChecked, handleCheckboxChange }: ExperimentListingProps) => {
	const { data: session } = useSession();

	const [project, setProject] = useState<ExperimentData>(projectData);

	const [busyDownloadingResults, setBusyDownloadingResults] = useState<boolean>(false);
	const [busyDownloadingZip, setBusyDownloadingZip] = useState<boolean>(false);

	const expectedTimeToRun = Math.round(project['estimatedTotalTimeMinutes'] * 100) / 100; // TODO: solve error when deleting experiment

	const totalRuns = project['totalExperimentRuns'] ?? 0;
	const runsLeft = totalRuns - (project['passes'] ?? 0) - (project['fails'] ?? 0);
	const experimentInProgress = !project['finished'] && project['startedAtEpochMillis'];

	// Calculate the expected finish time by adding expectedTimeToRun (in minutes) to the start time
	const expectedFinishTime = experimentInProgress ? new Date(project['startedAtEpochMillis'] + expectedTimeToRun * 60000) : null;
	// 60000 milliseconds in a minute  // Set to null if the experiment is not in progress

	const [projectName, setProjectName] = useState(projectData.name); // New state for edited project name
	const [isEditing, setIsEditing] = useState(false);
	const [editingCanceled, setEditingCanceled] = useState(false); // New state for tracking editing cancellation
	const [originalProjectName, setOriginalProjectName] = useState(projectData.name); // State to store the original project name

	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [showGraphModal, setShowGraphModal] = useState(false);

	const isClosed = experimentStates[projectData.expId] || false;

	const toggleState = () => {
		setExperimentStates((prevState) => ({
			...prevState,
			[projectData.expId]: !prevState[projectData.expId],
		}));
	};

	const handleEdit = () => {
		// Enable editing and set the edited project name to the current project name
		setIsEditing(true);
		setProjectName(project.name);
	};

	const handleSave = (newProjectName) => {
		updateExperimentNameById(project.expId, newProjectName).catch((reason) => {
			console.warn(`Failed to update experiment name, reason: ${reason}`);
		});
		// Exit the editing mode
		setIsEditing(false);
	};

	const handleCancel = () => {
		// Cancel the editing and revert to the original project name
		setProjectName(originalProjectName); // Revert to the original name
		setEditingCanceled(true);
		setIsEditing(false);
	};

	const handleArchiveStatus = (newStatus) => {
		updateExperimentArchiveStatusById(project.expId, newStatus).catch((reason) => {
			console.warn(`Failed to update experiment archive status, reason: ${reason}`);
		});
	};

	useEffect(() => {
		if (editingCanceled) {
			setProjectName(originalProjectName); // Revert to the original name
			setEditingCanceled(true);
		} else {
			// Do nothing here?
		}
	}, [editingCanceled, originalProjectName, project.expId]);

	//Update the project when data is changed
	useEffect(() => {
		setProject(projectData);
	}, [projectData]);


	const handleKeyUp = (e) => {
		if (e.key === 'Enter') {
			handleSave(e.target.value);
		} else if (e.key === 'Escape') {
			handleCancel();
		}
	};

	// Function to open the delete modal
	const openDeleteModal = () => {
		setDeleteModalOpen(true);
	};

	// Function to close the delete modal
	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const openGraphModal = () => {
		setShowGraphModal(true);
	};

	const closeGraphModal = () => {
		setShowGraphModal(false);
	}

	// const totalTime = project['startedAtEpochMillis'] && project['finishedAtEpochMilliseconds']
	// 	? ((Number(project['finishedAtEpochMilliseconds']) - Number(project['startedAtEpochMillis'])) / 60000)
	// 	: null;

	// const formattedTotalTime = totalTime !== null
	// 	? totalTime < 1
	// 		? `${(totalTime * 60).toFixed(2)} seconds`
	// 		: `${totalTime.toFixed(2)} minutes`
	// 	: null;


	// // Calculate average time per experiment run
	// const averageTimePerRun = project['passes'] && project['startedAtEpochMillis'] && project['finishedAtEpochMilliseconds']
	// 	? ((Number(project['finishedAtEpochMilliseconds']) - Number(project['startedAtEpochMillis'])) / 60000) / Number(project['passes'])
	// 	: null;

	// const formattedAverageTimePerRun = averageTimePerRun !== null
	// 	? averageTimePerRun < 1
	// 		? `${(averageTimePerRun * 60).toFixed(2)} seconds`
	// 		: `${averageTimePerRun.toFixed(2)} minutes`
	// 	: null;

	const formattedTotalTime = (project) => {
		const totalTime =
			project.startedAtEpochMillis && project.finishedAtEpochMilliseconds
				? (Number(project.finishedAtEpochMilliseconds) - Number(project.startedAtEpochMillis)) / 60000
				: null;

		return totalTime !== null
			? totalTime < 1
				? `${(totalTime * 60).toFixed(2)} seconds`
				: `${totalTime.toFixed(2)} minutes`
			: null;
	};

	const formattedAverageTimePerRun = (project) => {
		const averageTimePerRun =
			project.passes && project.startedAtEpochMillis && project.finishedAtEpochMilliseconds
				? ((Number(project.finishedAtEpochMilliseconds) - Number(project.startedAtEpochMillis)) / 60000) /
				Number(project.passes)
				: null;

		return averageTimePerRun !== null
			? averageTimePerRun < 1
				? `${(averageTimePerRun * 60).toFixed(2)} seconds`
				: `${averageTimePerRun.toFixed(2)} minutes`
			: null;
	};

	const getStatusText = (project, isClosed) => {
		const failures = project.fails ?? 0;
		const successes = project.passes ?? 0;
		const runsLeft = project.totalExperimentRuns
			? project.totalExperimentRuns - failures - successes
			: null;
		const expectedFinishTime = experimentInProgress
			? new Date(project.startedAtEpochMillis + (project.estimatedTotalTimeMinutes ?? 0) * 60000)
			: null;


		if (isClosed) {
			return (
				<>
					{/* Main Status */}
					<p className="text-lg font-bold text-black-500">
						{project.finished && project.status !== 'CANCELLED' ? (
							project.status === 'ARCHIVED' ? (
								'Experiment Archived'
							) : failures <= 1 && successes === 0 ? (
								'Experiment Aborted'
							) : (
								'Experiment Completed'
							)
						) : experimentInProgress && project.status !== 'CANCELLED' ? (
							'Experiment In Progress'
						) : project.status !== 'CANCELLED' ? (
							'Experiment Awaiting Start'
						) : (
							'Experiment Cancelled'
						)}
					</p>

					{/* Failures and Successes */}
					{(failures > 0 || successes > 0) && (
						<p className="text-lg font-mono text-gray-500">
							FAILS: <span className="text-red-500">{failures}</span>, SUCCESSES: <span className="text-green-500">{successes}</span>
						</p>
					)}
				</>
			);
		}
		else {
			return (
				<>
					{/* Main Status */}
					<p className="text-lg font-bold text-black-500">
						{project.finished && project.status !== 'CANCELLED' ? (
							project.status === 'ARCHIVED' ? (
								'Experiment Archived'
							) : failures <= 1 && successes === 0 ? (
								'Experiment Aborted'
							) : (
								'Experiment Completed'
							)
						) : experimentInProgress && project.status !== 'CANCELLED' ? (
							'Experiment In Progress'
						) : project.status !== 'CANCELLED' ? (
							'Experiment Awaiting Start'
						) : (
							'Experiment Cancelled'
						)}
					</p>

					{/* Failures and Successes */}
					{(failures > 0 || successes > 0) && (
						<p className="text-lg font-mono text-gray-500">
							FAILS: <span className="text-red-500">{failures}</span>, SUCCESSES: <span className="text-green-500">{successes}</span>
						</p>
					)}

					{/* Expected Total Time */}
					{project.status !== 'CANCELLED' && project.estimatedTotalTimeMinutes ? (
						<p className="text-sm font-mono text-gray-500">
							Expected Total Time: {project.estimatedTotalTimeMinutes} Minutes
						</p>
					) : null}
					{project.status !== 'CANCELLED' && project.status === 'RUNNING' && !project.estimatedTotalTimeMinutes ? (
						<p className="text-sm font-mono text-gray-500">
							(Calculating estimated runtime...)
						</p>
					): null}

					{/* Expected Finish Time */}
					{expectedFinishTime && project.status === "RUNNING" ? (
						<p className="text-sm font-mono text-gray-500">
							Expected Finish Time: {expectedFinishTime.toLocaleDateString()}
						</p>
					) : null}

					{/* Runs Left */}
					{runsLeft !== null && project.status !== "COMPLETED" && runsLeft > 0 ? (
						<p className="text-sm font-mono text-gray-500">
							{`${runsLeft} run${runsLeft === 1 ? '' : 's'} remain${runsLeft === 1 ? 's' : ''} (of ${project.totalExperimentRuns})`}
						</p>
					) : null}

					{/* Uploaded Time (always show if present) */}
					{project.created && (
						<p className="text-sm font-mono text-gray-500">
							Uploaded at {new Date(Number(project.created)).toLocaleString()}
						</p>
					)}

					{/* Started Time */}
					{project.startedAtEpochMillis && project.status !== 'CANCELLED' && project.status !== 'CREATED' ? (
						<p className="text-sm font-mono text-gray-500">
							Started at {new Date(project.startedAtEpochMillis).toLocaleString()}
						</p>
					) : null}

					{/* Finished Time */}
					{project.finishedAtEpochMilliseconds && project.status !== 'CANCELLED' ? (
						<p className="text-sm font-mono text-gray-500">
							Finished at {new Date(project.finishedAtEpochMilliseconds).toLocaleString()}
						</p>
					) : null}

					{/* Total Time */}
					{project.finishedAtEpochMilliseconds && project.startedAtEpochMillis && project.status === 'COMPLETED' ? (
						<p className="text-sm font-mono text-gray-500">
							Total Time: {formattedTotalTime(project)}
						</p>
					) : null}

					{/* Average Time Per Run */}
					{project.finishedAtEpochMilliseconds && project.startedAtEpochMillis && project.status === 'COMPLETED' && successes > 0 ? (
						<p className="text-sm font-mono text-gray-500">
							Average Time per Experiment Run: {formattedAverageTimePerRun(project)}
						</p>
					) : null}
				</>
			);
		}

	};


	return (
		<div className={`flex flex-col sm:flex-row items-start sm:items-center ${multiSelectMode ? '' : 'justify-between'} space-y-4 sm:space-y-0 sm:space-x-4`}>
			{/* Checkbox for multi-select - reduced spacing */}
			{multiSelectMode && (
				<div className="flex items-center w-6 sm:w-8">
					<input
						type="checkbox"
						checked={isChecked}
						onChange={(e) => handleCheckboxChange(projectData.expId, e.target.checked)}
						className="form-checkbox h-5 w-5 text-blue-600 rounded-full"
					/>
				</div>
			)}
			<div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between w-full ${multiSelectMode ? 'ml-4' : ''}`}>
				<div className="min-w-0 space-y-3">
					<div className="inline-flex items-center justify-center cursor-pointer hover:opacity-80">
						{isClosed ? (
							<span className='text-sm font-medium' style={{ display: 'flex', alignItems: 'center' }}>
								{project.status == 'COMPLETED' || project.status == 'ARCHIVED' ?
									(<ChevronRightIcon
										onClick={toggleState} // Toggle to open
										className="h-5 w-5 text-gray-400"
										aria-hidden="true"
									/>)
									: null}
								{isEditing ? (
									<>
										<input
											type="text"
											value={projectName}
											onChange={(e) => setProjectName(e.target.value)}
											onKeyUp={handleKeyUp}
											className="border rounded-md px-2 py-1 text-sm w-full sm:w-auto"
										/>
										<CheckIcon className="w-10 h-5 text-green-500 cursor-pointer"
											onClick={() => handleSave(projectName)} />
										<XMarkIcon className="w-5 h-5 text-red-500 cursor-pointer" onClick={handleCancel} />
									</>
								) : (
									<>
										<span
											className="editable-text"
										>
											{project.name}
										</span>
										{project.creator == session?.user?.id! ? <MdEdit
											className="icon edit-icon"
											onClick={handleEdit}
										/> : <></>}

									</>
								)}
							</span>
						) :
							(<span className='text-sm font-medium' style={{ display: 'flex', alignItems: 'center' }}>
								{project.status == 'COMPLETED' || project.status == 'ARCHIVED' ?
									(<ChevronDownIcon
										onClick={toggleState} // Toggle to close
										className="h-5 w-5 text-gray-400"
										aria-hidden="true"
									/>)
									: null}
							</span>)
						}
					</div>

					{!isClosed ?
						<div className='flex items-center space-x-3'>
							<span className='text-sm font-medium' style={{ display: 'flex', alignItems: 'center' }}>
								{isEditing ? (
									<>
										<input
											type="text"
											value={projectName}
											onChange={(e) => setProjectName(e.target.value)}
											onKeyUp={handleKeyUp}
										/>
										<CheckIcon className="w-10 h-5 text-green-500 cursor-pointer"
											onClick={() => handleSave(projectName)} />
										<XMarkIcon className="w-5 h-5 text-red-500 cursor-pointer" onClick={handleCancel} />
									</>
								) : (
									<>
										<span
											className="editable-text"
										>
											{project.name}
										</span>
										{project.creator == session?.user?.id! ? <MdEdit
											className="icon edit-icon"
											onClick={handleEdit}
										/> : <></>}

									</>
								)}
							</span>
						</div> :
						null
					}

					<div className="flex items-center flex-wrap gap-1 justify-left">
						{project.tags &&
							project.tags.map((title) =>(
								<ReadOnlyTag key={title} text={title} />
							))}
					</div>

					<div className="text-sm font-mono text-gray-500 sm:hidden text-left">
						{getStatusText(project, experimentStates[project.expId])}
					</div>

					{!isClosed && project['finished'] && project.status != 'CANCELLED' ?
						<>
							<button type="button"
								className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto xl:w-full"
								onClick={() => {
									window.open(`/api/download/logs/${project.expId}`, '_blank');
								}}>
								View System Log
								<ExclamationTriangleIcon className='h-5 w-5 ml-2' aria-hidden='true' />
							</button>
						</>
						:
						null
					}

					{isDeleteModalOpen && (
						<div className="fixed z-10 inset-0 overflow-y-auto">
							<div
								className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
								<div className="fixed inset-0 transition-opacity" aria-hidden="true">
									<div className="absolute inset-0 bg-gray-500 opacity-75"></div>
								</div>

								<span
									className="hidden sm:inline-block sm:align-middle sm:h-screen"
									aria-hidden="true">
									&#8203;
								</span>

								<div
									className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
									role="dialog"
									style={{ padding: '1rem' }}
									aria-modal="true"
									aria-labelledby="modal-headline"
								>
									<div className="bg-white">
										<div className="relative bg-white">
											<div className="text-center mt-2">
												<p className="text-xl font-extrabold text-gray-900">Delete Experiment</p>
											</div>
										</div>

										<div className="px-4 py-2">
											<p className="text-gray-500">Are you sure you want to delete this
												experiment?</p>
										</div>

										<div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
											<button
												onClick={() => {
													onDeleteExperiment(project.expId);
													closeDeleteModal(); // Close the modal after deletion
												}}
												className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
											>
												Delete
											</button>
											<button
												onClick={closeDeleteModal}
												className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
											>
												Cancel
												<MinusIcon className='h-5 w-5 ml-2' aria-hidden='true' />
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
					{
						project.status === 'RUNNING' ?
							<button type="button"
								className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto xl:w-full"
								onClick={() => {
									// Open a new tab at the livelog page
									window.open(`/livelog?id=${project.expId}`, '_blank');
								}}>
								Open Live Log
								<BookOpenIcon className='h-5 w-5 ml-2' aria-hidden='true' />
							</button> : null
					}
					{
						project.status != 'COMPLETED' && project.status != 'ARCHIVED' ?
							<button type="button"
								className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto xl:w-full"
								onClick={() => {
									onCopyExperiment(project.expId);
								}}>
								Copy Experiment
								<DocumentDuplicateIcon className='h-5 w-5 ml-2' aria-hidden='true' />
							</button> :
							(!isClosed ?
								<button type="button"
									className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto xl:w-full"
									onClick={() => {
										onCopyExperiment(project.expId);
									}}>
									Copy Experiment
									<DocumentDuplicateIcon className='h-5 w-5 ml-2' aria-hidden='true' />
								</button> : null)
					}
					{!isClosed && project.finished && project.status != 'CANCELLED' ? (
						<div className="hidden sm:block">
							<button
								type="button"
								className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
								onClick={openGraphModal}
							>
								See Graph
								<ChartBarIcon className="h-5 w-5 ml-2" aria-hidden="true" />
							</button>
						</div>
					) : null}

					{!isClosed && project['finished'] && project.status != 'CANCELLED' ? (
						<div className="flex flex-col space-y-4">
							<div className="flex space-x-4">
								<button
									type="button"
									className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-auto xl:whitespace-nowrap sm:w-full xl:w-auto'
									disabled={busyDownloadingResults}
									onClick={async () => {
										setBusyDownloadingResults(true);
										await onDownloadResults(project.expId);
										setBusyDownloadingResults(false);
									}}
								>
									{busyDownloadingResults ? 'Preparing Results...' : 'Download Results'}
									<DocumentCheckIcon className='h-5 w-5 ml-2' aria-hidden='true' />
								</button>
								<button
										type="button"
										className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-auto xl:whitespace-nowrap sm:w-full xl:w-auto'
										disabled={busyDownloadingZip}
										onClick={async () => {
											setBusyDownloadingZip(true);
											await onDownloadProjectZip(project.expId);
											setBusyDownloadingZip(false);
										}}
									>
										{busyDownloadingZip ? 'Preparing Project Zip...' : 'Download Project Zip'}
										<FolderArrowDownIcon className='h-5 w-5 ml-2' aria-hidden='true' />
								</button>
							</div>
						</div>
					) : null
					}

					{
						project.status != 'COMPLETED' && project.status != 'ARCHIVED' ?
							(project.creator == session?.user?.id! && project.status != 'CANCELLED' ?
								<button
									type="button"
									className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto xl:w-full"
									onClick={async () => {
										// Get the link
										const link = await addShareLink(project.expId);
										// Copy the link to the clipboard
										navigator.clipboard.writeText(`${window.location.origin}/share?link=${link}`);
										toast.success('Link copied to clipboard!', { duration: 1500 });
									}}
								>
									Share Experiment
									<ShareIcon className='h-5 w-5 ml-2' aria-hidden='true' />
								</button> : null) :
							(!isClosed && project.creator == session?.user?.id! ?
								<button
									type="button"
									className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto xl:w-full"
									onClick={async () => {
										// Get the link
										const link = await addShareLink(project.expId);
										// Copy the link to the clipboard
										navigator.clipboard.writeText(`${window.location.origin}/share?link=${link}`);
										toast.success('Link copied to clipboard!', { duration: 1500 });
									}}
								>
									Share Experiment
									<ShareIcon className='h-5 w-5 ml-2' aria-hidden='true' />
								</button> : null)
					}
					{
						project.creator == session?.user?.id! && project.status != 'COMPLETED' && project.status != 'CANCELLED' && project.status != 'ARCHIVED' &&
						<button type="button"
							className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto xl:w-full'
							onClick={() => {
								toast.promise(cancelExperimentById(project.expId), {
									success: 'Cancelled experiment',
									error: 'Failed to cancel experiment',
									loading: 'Cancelling experiment...'
								});
							}}
						>
							Cancel Experiment
							<MinusIcon className='h-5 w-5 ml-2' aria-hidden='true' />
						</button>
					}
				</div>

				<div className={`flex flex-col flex-shrink-0 items-end space-y-3 ${multiSelectMode ? 'ml-4' : ''}`}>
					<div className="flex items-center space-x-4 mt-4">
						{project.finished && project.status !== 'CANCELLED' && isClosed && !multiSelectMode && (
							<div className="flex items-center space-x-4 sm:mt-4 sm:ml-4">
								{project.creator === session?.user?.id! && (
									<button
										type="button"
										className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
										onClick={async () => {
											const link = await addShareLink(project.expId);
											navigator.clipboard.writeText(`${window.location.origin}/share?link=${link}`);
											toast.success('Link copied to clipboard!', { duration: 1500 });
										}}
									>
										Share
										<ShareIcon className="h-5 w-5 ml-2" aria-hidden="true" />
									</button>
								)}

								<button
									type="button"
									className={`inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${project.status !== 'ARCHIVED' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-500 hover:bg-gray-600'
										} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500`}
									style={{ marginRight: '1rem' }}
								>
									{project.status !== 'ARCHIVED' ? 'Archive' : 'Unarchive'}
									<ArchiveBoxIcon className="h-5 w-5 ml-2" aria-hidden="true" />
								</button>
							</div>
						)}

						<div>
							{/* Status Text */}
							<div className="hidden sm:block text-sm font-mono text-gray-500 text-right">
								{getStatusText(project, experimentStates[project.expId])}
							</div>
						</div>

					</div>
					<div className="items-center space-y-2">
						{!isClosed && project['finished'] && project.status != 'CANCELLED' ? (
							<button type="button"
								className={`inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${project.status != 'ARCHIVED' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-500 hover:bg-gray-600'
									} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full`}
								onClick={() => {
									const newArchiveStatus = project.status !== 'ARCHIVED';
									const newStatus = newArchiveStatus ? 'ARCHIVED' : 'COMPLETED';
									handleArchiveStatus(newStatus);
								}}
							>
								{project.status != 'ARCHIVED' ? 'Archive Experiment' : 'Unarchive Experiment'}
								<ArchiveBoxIcon className='h-5 w-5 ml-2' aria-hidden='true' />
							</button>
						) : null}
						{
							!isClosed ?
								(
									project.creator == session?.user?.id! ?
										(
											project.finished ?
												<button type="button"
													className='bg-red-500 hover:bg-red-700 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500  w-full sm:w-auto xl:w-full'
													onClick={() => {
														openDeleteModal();
													}}>
													Delete Experiment
													<XMarkIcon className='h-5 w-5 ml-2' aria-hidden='true' />
												</button>
												:
												null
										)
										:
										<button type="button"
											className='bg-red-500 hover:bg-red-700 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500  w-full sm:w-auto xl:w-full'
											onClick={() => {
												toast.promise(unfollowExperiment(project.expId, session?.user?.id!), {
													success: 'Unfollowed experiment',
													error: 'Failed to unfollow experiment',
													loading: "Unfollowing experiment..."
												});
											}}>
											Unfollow Experiment
											<MinusIcon className='h-5 w-5 ml-2' aria-hidden='true' />
										</button>
								) : null
						}
					</div>

					{
						(showGraphModal && project.finished && project.status != 'CANCELLED') && (
							<Chart onClose={closeGraphModal} project={project} />
						)
					}
				</div>
			</div>
		</div>
	);
};
