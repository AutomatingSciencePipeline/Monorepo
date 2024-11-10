/* eslint-disable no-mixed-spaces-and-tabs */
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { ExperimentDocumentId, updateExperimentName, getCurrentProjectName } from '../../../../firebase/db';
import { ExperimentData } from '../../../../firebase/db_types';
import { MdEdit, MdPadding } from 'react-icons/md';
import { Timestamp } from 'mongodb';

export interface ExperimentListingProps {
	projectinit: ExperimentData;
	onCopyExperiment: (experimentId: ExperimentDocumentId) => void;
	onDownloadResults: (experimentId: ExperimentDocumentId) => Promise<void>;
	onDownloadProjectZip: (experimentId: ExperimentDocumentId) => Promise<void>;
	onDeleteExperiment: (experimentId: ExperimentDocumentId) => void;
}


export const ExperimentListing = ({ projectinit, onCopyExperiment, onDownloadResults, onDownloadProjectZip, onDeleteExperiment }: ExperimentListingProps) => {
	const [project, setProject] = useState<ExperimentData>(projectinit);

	const [busyDownloadingResults, setBusyDownloadingResults] = useState<boolean>(false);
	const [busyDownloadingZip, setBusyDownloadingZip] = useState<boolean>(false);

	const expectedTimeToRun = Math.round(project['estimatedTotalTimeMinutes'] * 100) / 100; // TODO: solve error when deleting experiment

	const totalRuns = project['totalExperimentRuns'] ?? 0;
	const runsLeft = totalRuns - (project['passes'] ?? 0) - (project['fails'] ?? 0);
	const experimentInProgress = !project['finished'] && project['startedAtEpochMillis'];

	// Calculate the expected finish time by adding expectedTimeToRun (in minutes) to the start time
	const expectedFinishTime = experimentInProgress ? new Date(project['startedAtEpochMillis'] + expectedTimeToRun * 60000) : null;
	// 60000 milliseconds in a minute  // Set to null if the experiment is not in progress

	const [projectName, setProjectName] = useState(projectinit.name); // New state for edited project name
	const [isEditing, setIsEditing] = useState(false);
	const [editingCanceled, setEditingCanceled] = useState(false); // New state for tracking editing cancellation
	const [originalProjectName, setOriginalProjectName] = useState(projectinit.name); // State to store the original project name

	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

	const handleEdit = () => {
		// Enable editing and set the edited project name to the current project name
		setIsEditing(true);
		setProjectName(project.name);
	};

	const handleSave = (newProjectName) => {
		// Update the project name in Firebase with the edited name
		updateExperimentName(project.expId, projectName);

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
			const eventSource = new EventSource(`/api/experiments/subscribe?expId=${project.expId}`);
			eventSource.onmessage = (event) => {
				if (event.data !== 'heartbeat') {
					setProject(JSON.parse(event.data) as ExperimentData);
					console.log(project.creator);
				}

			}
		}
	}, [editingCanceled, originalProjectName, project.expId]);


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
								{/* <button className="save-button" onClick={handleSave}>Save</button>
								<button className="cancel-button" onClick={handleCancel}>Cancel</button> */}
							</>
						) : (
							<>
								<span
									className="editable-text"
									onClick={handleEdit}
								>
									{project.name}
								</span>
								<MdEdit
									className="icon edit-icon"
									onClick={handleEdit}
								/>
							</>
						)}
					</span>


				</div>
				{project['finished'] == true ?
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
				{project['finished'] == true ?
					<button type="button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={() => {
							window.open(`/api/download/logs/${project.expId}`, '_blank');
						}}>
						View System Log
					</button> :
					null
				}
				{project['finished'] == true && (project['trialExtraFile'] || project['scatter'] || project['keepLogs']) ?
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
				<button
					type="button"
					className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
					onClick={openDeleteModal}
				>
					Delete Experiment
				</button>
			</div>
			<div className='sm:hidden'>
				<ChevronRightIcon
					className='h-5 w-5 text-gray-400'
					aria-hidden='true'
				/>
			</div>
			<div className='hidden sm:flex flex-col flex-shrink-0 items-end space-y-3'>
				<p className='flex items-center space-x-4'>
					{project.finished ?
						(project.fails <= 1 && (project?.passes ?? 0) == 0 ?
							<span className='font-mono text-red-500'>Experiment Aborted</span> :
							<span className='font-mono'>Experiment Completed</span>
						) : (experimentInProgress ?
							<span className='font-mono text-blue-500'>Experiment In Progress</span> :
							<span className='font-mono text-gray-500'>Experiment Awaiting Start</span>)
					}
				</p>
				{project.finished || experimentInProgress ?
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
					expectedFinishTime && (
						<p className='flex text-gray-500 text-sm space-x-2'>
							<span> Expected Finish Time: {expectedFinishTime.toLocaleDateString()}</span>
						</p>
					) :
					null
				}
				{experimentInProgress ?
					(project['totalExperimentRuns'] ?
						<p>{`${runsLeft} run${runsLeft == 1 ? '' : 's'} remain${runsLeft == 1 ? 's' : ''} (of ${project['totalExperimentRuns']})`}</p> :
						<p>(Calculating total experiment runs...)</p>
					) :
					null
				}
				<p className='flex text-gray-500 text-sm space-x-2'>
					<span>Uploaded at {new Date(project['created']).toLocaleString()}</span>
				</p>
				{project['startedAtEpochMillis'] ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Started at {new Date(project['startedAtEpochMillis']).toLocaleString()}</span>
					</p> :
					null
				}
				{project['finishedAtEpochMillis'] ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Finished at {new Date(project['finishedAtEpochMillis']).toLocaleString()}</span>
					</p> :
					null
				}
			</div>
		</div>
	);
};


