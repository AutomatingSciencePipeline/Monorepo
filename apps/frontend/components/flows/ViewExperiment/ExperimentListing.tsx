import { ChevronRightIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { ExperimentDocumentId, subscribeToExp } from '../../../firebase/db';
import { ExperimentData } from '../../../firebase/db_types';

export interface ExperimentListingProps {
	projectinit: ExperimentData,
	onCopyExperiment: (experimentId: ExperimentDocumentId) => void
	onDownloadResults: (experimentId: ExperimentDocumentId) => void,
	onDownloadProjectZip: (experimentId: ExperimentDocumentId) => void,
}


export const ExperimentListing = ({ projectinit, onCopyExperiment, onDownloadResults, onDownloadProjectZip }: ExperimentListingProps) => {
	const [project, setProject] = useState<ExperimentData>(projectinit);

	const expectedTimeToRun = Math.round(project['estimatedTotalTimeMinutes']*100)/100;
	const totalRuns = project['totalExperimentRuns'] ?? 0;
	const runsLeft = totalRuns - (project['passes'] ?? 0) - (project['fails'] ?? 0);
	const experimentInProgress = !project['finished'] && project['startedAtEpochMillis'];

	useEffect(() => subscribeToExp(project.expId, (data) => {
		setProject(data as ExperimentData); // TODO this assumes that all values will be present, which is not true
	}), []); // TODO adding project causes render loop

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
					<button type= "button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={() => {
							onDownloadResults(project.expId);
						}}>
						Download Results
					</button> :
					null
				}
				{project['finished'] == true && (project['trialExtraFile'] || project['scatter'] || project['keepLogs']) ?
					<button type= "button"
						className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'
						onClick={() => {
							onDownloadProjectZip(project.expId);
						}}>
						Download Project Zip
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
				{/* TODO we don't make use of this display field */}
				{/* <a
					href={project.repoHref}
					className='relative group flex items-center space-x-2.5'
				>
					<span className='text-sm text-gray-500 group-hover:text-gray-900 font-medium truncate'>
						{project.description}
					</span>
				</a> */}
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