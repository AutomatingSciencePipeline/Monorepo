/* eslint-disable no-mixed-spaces-and-tabs */
import { CheckIcon, XMarkIcon,ChevronRightIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { ExperimentData } from '../../../../lib/db_types';
import { MdEdit } from 'react-icons/md';
import Chart from './Chart';
import { addShareLink, unfollowExperiment, updateExperimentNameById, cancelExperimentById } from '../../../../lib/mongodb_funcs';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export interface ExperimentListingProps {
	projectData: ExperimentData;
	onCopyExperiment: (experimentId: string) => void;
	onDownloadResults: (experimentId: string) => Promise<void>;
	onDownloadProjectZip: (experimentId: string) => Promise<void>;
	onDeleteExperiment: (experimentId: string) => void;
}


export const ExperimentListing = ({ projectData: projectData, onCopyExperiment, onDownloadResults, onDownloadProjectZip, onDeleteExperiment }: ExperimentListingProps) => {
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

	const handleEdit = () => {
		// Enable editing and set the edited project name to the current project name
		setIsEditing(true);
		setProjectName(project.name);
	};

	const handleSave = (newProjectName) => {
		updateExperimentNameById(project.expId, newProjectName).catch((reason) => {
			console.log(`Failed to update experiment name, reason: ${reason}`);
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

	useEffect(() => {
		console.log(project.creator);
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

	const totalTime = project['startedAtEpochMillis'] && project['finishedAtEpochMilliseconds']
		? ((Number(project['finishedAtEpochMilliseconds']) - Number(project['startedAtEpochMillis'])) / 60000)
		: null;

	const formattedTotalTime = totalTime !== null
		? totalTime < 1
			? `${(totalTime * 60).toFixed(2)} seconds`
			: `${totalTime.toFixed(2)} minutes`
		: null;


	// Calculate average time per experiment run
	const averageTimePerRun = project['passes'] && project['startedAtEpochMillis'] && project['finishedAtEpochMilliseconds']
		? ((Number(project['finishedAtEpochMilliseconds']) - Number(project['startedAtEpochMillis'])) / 60000) / Number(project['passes'])
		: null;

	const formattedAverageTimePerRun = averageTimePerRun !== null
		? averageTimePerRun < 1
			? `${(averageTimePerRun * 60).toFixed(2)} seconds`
			: `${averageTimePerRun.toFixed(2)} minutes`
		: null;

	return (
		<div className='flex items-center justify-between space-x-4'>
			<div className='min-w-0 space-y-3'>
				<div className='flex items-center space-x-3'>
					<span className='text-sm font-medium' style={{ display: 'flex', alignItems: 'center' }}>
						{isEditing ? (
							<>
								<input
									type="text"
									value={projectName}
									onChange={(e) => setProjectName(e.target.value)}
									onBlur={handleCancel}
									onKeyUp={handleKeyUp}
								/>
								<CheckIcon className="w-5 h-5 text-green-500 cursor-pointer" onClick={() => handleSave(projectName)} />
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


				</div>
				{project['finished'] == true && project.status != 'CANCELLED' ?
					<button type="button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						disabled={busyDownloadingResults}
						onClick={async () => {
							setBusyDownloadingResults(true);
							await onDownloadResults(project.expId);
							setBusyDownloadingResults(false);
						}}>
						{busyDownloadingResults ? 'Preparing Results...' : 'Download Results'}
					</button> :
					null
				}
				{project['finished'] == true && project.status != 'CANCELLED' ?
					<button type="button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={() => {
							window.open(`/api/download/logs/${project.expId}`, '_blank');
						}}>
						View System Log
					</button> :
					null
				}
				{project['finished'] == true && (project['trialExtraFile'] || project['scatter'] || project['keepLogs']) && project.status != 'CANCELLED' ?
					<button type="button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						disabled={busyDownloadingZip}
						onClick={async () => {
							setBusyDownloadingZip(true);
							await onDownloadProjectZip(project.expId);
							setBusyDownloadingZip(false);
						}}>
						{busyDownloadingZip ? 'Preparing Project Zip...' : 'Download Project Zip'}
					</button> :
					null
				}

				{isDeleteModalOpen && (
					<div className="fixed z-10 inset-0 overflow-y-auto">
						<div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
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
										<p className="text-gray-500">Are you sure you want to delete this experiment?</p>
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
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
				<button type="button"
					className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
					onClick={() => {
						onCopyExperiment(project.expId);
					}}>
					Copy Experiment
				</button>
				{/* <button type="button"
					className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
					onClick={() => {
						onDeleteExperiment(project.expId);
					}}>
					Delete Experiment
				</button> */}
				{
					project.creator == session?.user?.id! ?
						(
							project.finished ?
								<button type="button"
									className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
									onClick={() => {
										openDeleteModal();
									}}>
									Delete Experiment
								</button>
								:
								<button type="button"
									className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
									onClick={() => {
										toast.promise(cancelExperimentById(project.expId), {
											success: 'Cancelled experiment', error: 'Failed to cancel experiment', loading: 'Cancelling experiment...'
										});
									}}
								>
									Cancel Experiment
								</button>
						)
						:
						<button type="button"
							className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
							onClick={() => {
								toast.promise(unfollowExperiment(project.expId, session?.user?.id!), {
									success: 'Unfollowed experiment', error: 'Failed to unfollow experiment',
									loading: "Unfollowing experiment..."
								});
							}}>
							Unfollow Experiment
						</button>
				}
				{project.finished && project.status != 'CANCELLED' ?
					<button type="button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={openGraphModal}
					>
						See Graph
					</button> : null
				}
				{
					project.creator == session?.user?.id! && project.status != 'CANCELLED' ?
						<button
							type="button"
							className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
							onClick={
								async () => {
									//Get the link
									const link = await addShareLink(project.expId);
									//Copy the link to the clipboard
									navigator.clipboard.writeText(`${window.location.origin}/share?link=${link}`);
									toast.success('Link copied to clipboard!', { duration: 1500 });
								}
							}
						>
							Share Experiment
						</button> : null
				}
			</div>
			<div className='sm:hidden'>
				<ChevronRightIcon
					className='h-5 w-5 text-gray-400'
					aria-hidden='true'
				/>
			</div>
			<div className='hidden sm:flex flex-col flex-shrink-0 items-end space-y-3'>
				<p className='flex items-center space-x-4'>
					{project.finished && project.status != 'CANCELLED' ? (
						project.fails <= 1 && (project?.passes ?? 0) == 0 ? (
							<span className='font-mono text-red-500'>Experiment Aborted</span>
						) : (
							<span className='font-mono'>Experiment Completed</span>
						)
					) : experimentInProgress && project.status != 'CANCELLED' ? (
						<span className='font-mono text-blue-500'>Experiment In Progress</span>
					) : project.status != 'CANCELLED' ? (
						<span className='font-mono text-gray-500'>Experiment Awaiting Start</span>
					) : null}
					{project.status == 'CANCELLED' ? (
						<span className='font-mono text-red-500'>Experiment Cancelled</span>
					) : null}
				</p>
				{(project.finished || experimentInProgress) && project.status != 'CANCELLED' ?
					<p className='flex items-center space-x-4'>
						<span className={`font-mono ${project['fails'] ? 'text-red-500' : ''}`}>FAILS: {project['fails'] ?? 0}</span>
						<span className='font-mono'>SUCCESSES: {project['passes'] ?? 0}</span>
					</p> :
					null
				}
				{experimentInProgress && project.status != 'CANCELLED' ?
					<p>
						{expectedTimeToRun ? `Expected Total Time: ${expectedTimeToRun} Minutes` : '(Calculating estimated runtime...)'}
					</p> :
					null
				}
				{experimentInProgress && project.status != 'CANCELLED' ?
					expectedFinishTime && (
						<p className='flex text-gray-500 text-sm space-x-2'>
							<span> Expected Finish Time: {expectedFinishTime.toLocaleDateString()}</span>
						</p>
					) :
					null
				}
				{experimentInProgress && project.status != 'CANCELLED' ?
					(project['totalExperimentRuns'] ?
						<p>{`${runsLeft} run${runsLeft == 1 ? '' : 's'} remain${runsLeft == 1 ? 's' : ''} (of ${project['totalExperimentRuns']})`}</p> :
						<p>(Calculating total experiment runs...)</p>
					) :
					null
				}
				<p className='flex text-gray-500 text-sm space-x-2'>
					<span>Uploaded at {new Date(Number(project['created'])).toLocaleString()}</span>
				</p>
				{project['startedAtEpochMillis'] && project.status != 'CANCELLED' ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Started at {new Date(project['startedAtEpochMillis']).toLocaleString()}</span>
					</p> :
					null
				}
				{project['finishedAtEpochMilliseconds'] && project.status != 'CANCELLED' ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Finished at {new Date(project['finishedAtEpochMilliseconds']).toLocaleString()}</span>
					</p> :
					null
				}
				{project['finishedAtEpochMilliseconds'] && project.status != 'CANCELLED' ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Total Time: {formattedTotalTime}</span>
					</p> :
					null
				}
				{project['finishedAtEpochMilliseconds'] && project.status != 'CANCELLED' ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Average Time per Experiment Run: {formattedAverageTimePerRun}</span>
					</p> :
					null
				}
				{
					(showGraphModal && project.finished && project.status != 'CANCELLED') && (
						<Chart onClose={closeGraphModal} project={project} />
					)
				}
			</div>
		</div>
	);
};


