/* eslint-disable no-mixed-spaces-and-tabs */
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { ExperimentDocumentId, subscribeToExp } from '../../../firebase/db';
import { ExperimentData } from '../../../firebase/db_types';
import { MdEdit } from 'react-icons/md';
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

	const expectedTimeToRun = Math.round(project['estimatedTotalTimeMinutes']*100)/100; //TODO: solve error when deleting experiment

	const totalRuns = project['totalExperimentRuns'] ?? 0;
	const runsLeft = totalRuns - (project['passes'] ?? 0) - (project['fails'] ?? 0);
	const experimentInProgress = !project['finished'] && project['startedAtEpochMillis'];

	// Calculate the expected finish time by adding expectedTimeToRun (in minutes) to the start time
	const expectedFinishTime = experimentInProgress ? new Date(project['startedAtEpochMillis'] + expectedTimeToRun * 60000) : null;
	// 60000 milliseconds in a minute  // Set to null if the experiment is not in progress
	const [isEditing, setIsEditing] = useState(false);

	const handleSave = () => {
	  // Save the edited project name, e.g., make an API call or update the state.
	  setIsEditing(false);
	};

	const handleKeyUp = (e) => {
	  if (e.key === 'Enter') {
			handleSave();
	  } else if (e.key === 'Escape') {
			handleCancel();
	  }
	};

	const handleCancel = () => {
	  // Cancel the editing and revert to the original project name.
	  setIsEditing(false);
	};


	useEffect(() => subscribeToExp(project.expId, (data) => {
		setProject(data as ExperimentData); // TODO this assumes that all values will be present, which is not true
	}), []);

	return (
		<div className='flex items-center justify-between space-x-4'>
			<div className='min-w-0 space-y-3'>
				<div className='flex items-center space-x-3'>
					<span className='text-sm font-medium' style={{ display: 'flex', alignItems: 'center' }}>
						{isEditing ? (
							<>
								<input
									type="text"
									value={project.name}
									onChange={(e) => setProject({ ...project, name: e.target.value })}
									onBlur={handleSave}
									onKeyUp={handleKeyUp}
								/>
								<button className="save-button" onClick={handleSave}>Save</button>
								<button className="cancel-button" onClick={handleCancel}>Cancel</button>
							</>
						) : (
							<>
								<span
									onClick={() => setIsEditing(true)}
									className="editable-text"
								>
									{project.name}
								</span>
								<MdEdit
									className="icon edit-icon"
									onClick={() => setIsEditing(true)}
								/>
							</>
						)}
					</span>


				</div>
				{project['finished'] == true ?
					<button type= "button"
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
					<button type= "button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={() => {
							window.open(`/api/download/logs/${project.expId}`, '_blank');
						}}>
						View System Log
					</button> :
					null
				}
				{project['finished'] == true && (project['trialExtraFile'] || project['scatter'] || project['keepLogs']) ?
					<button type= "button"
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
				<button type= "button"
					className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
					onClick={() => {
						onCopyExperiment(project.expId);
					}}>
					Copy Experiment
				</button>
				<button type="button"
					className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
					onClick={() => {
						onDeleteExperiment(project.expId);
					}}>
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
							<span> Expected Finish Time: {expectedFinishTime.toString()}</span>
							{/* expectedFinishTime.toString().substring(4, 23) */}
						</p>
					) :
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
					<span>Uploaded at {new Date(project['created']).toString().substring(4, 31)}</span>
				</p>
				{project['startedAtEpochMillis'] ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Started at {new Date(project['startedAtEpochMillis']).toString().substring(4, 31)}</span>
					</p> :
					null
				}
				{project['finishedAtEpochMillis'] ?
					<p className='flex text-gray-500 text-sm space-x-2'>
						<span>Finished at {new Date(project['finishedAtEpochMillis']).toString().substring(4, 31)}</span>
					</p> :
					null
				}
			</div>
		</div>
	);
};
