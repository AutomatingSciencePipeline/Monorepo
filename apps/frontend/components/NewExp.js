import { Fragment, useState, useLayoutEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Upload, X, File } from 'tabler-icons-react';
import { Toggle } from './Toggle';

import Parameter from './Parameter';
import { Code, Text, useMantineTheme, Group } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';

import { useForm, formList, joiResolver } from '@mantine/form';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { experimentSchema } from '../utils/validators';
import { submitExperiment, uploadExec } from '../firebase/db';
import { useAuth } from '../firebase/fbAuth';

const State = {
	"Home": -1,
	"Info": 0,
	"Params": 1,
	"Confirmation": 2,
	"Dispatch": 3
}

const Steps = ({ steps }) => {
	return (
		<ol className='grow space-y-4 md:flex md:space-y-0 md:space-x-8'>
			{steps.map((step) => (
				<li key={step.name} className='md:flex-1'>
					{step.status === 'complete' ? (
						<a
							href={step.href}
							className='group pl-4 py-2 flex flex-col border-l-4 border-blue-600 md:pl-0 md:pt-4 md:pb-0 md:border-l-0 md:border-t-4'
						>
							<span className='text-sm font-medium'>{step.name}</span>
						</a>
					) : step.status === 'current' ? (
						<a
							href={step.href}
							className='pl-4 py-2 flex flex-col border-l-4 border-blue-600 md:pl-0 md:pt-4 md:pb-0 md:border-l-0 md:border-t-4'
							aria-current='step'
						>
							<span className='text-sm font-medium'>{step.name}</span>
						</a>
					) : (
						<a
							href={step.href}
							className='group pl-4 py-2 flex flex-col border-l-4 border-gray-200 md:pl-0 md:pt-4 md:pb-0 md:border-l-0 md:border-t-4'
						>
							<span className='text-sm font-medium'>{step.name}</span>
						</a>
					)}
				</li>
			))}
		</ol>
	);
};

const InputSection = ({ header, ...props }) => {
	return (
		<div className='space-y-1 px-4 sm:grid sm:grid-cols-5 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5'>
			<div>
				<label className='block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2'>
					{' '}
					{header}{' '}
				</label>
			</div>
			{props.children}
		</div>
	);
};

const InformationStep = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Name'}>
					<div className='sm:col-span-4'>
						<input
							type='text'
							{...form.getInputProps('name')}
							className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>

				<InputSection header={'Description'}>
					<div className='sm:col-span-4'>
						<textarea
							{...form.getInputProps('description')}
							rows={3}
							className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>

				<InputSection header={'File Output'}>
					<div className='sm:col-span-4'>
						<input
							type='text'
							placeholder='Name and extension of the output CSV file'
							{...form.getInputProps('fileOutput')}
							className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
				<InputSection header={'Result Output'}>
					<div className='sm:col-span-4'>
						<input
							type='text'
							placeholder='Name and extension of the experiment results file'
							{...form.getInputProps('resultOutput')}
							className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
			</Fragment>
		</div>
	);
};

const ParamStep = ({form, ...props}) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Parameters'}>
					<div className='sm:col-span-4 inline-flex'>
						<span className='rounded-l-md text-sm text-white font-bold bg-blue-600  items-center px-4 py-2 border border-transparent'>
							+
						</span>
						<span className='relative z-0 inline-flex flex-1 shadow-sm rounded-md'>
							{['integer', 'float', 'bool', 'string'].map((type) => (
								<button
									type='button'
									className='-ml-px relative items-center flex-1 px-6 py-2 last:rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:border-blue-500'
									onClick={() =>
										form.addListItem('parameters', {
											name: '',
											default: '',
											...((type === 'integer' || type === 'float') && {
												min: '',
												max: '',
												step: '',
											}),
											type: type,
										})
									}
								>
									{type}
								</button>
							))}
						</span>
					</div>
				</InputSection>

				<div className={'flex-0 p-4 h-full grow-0'}>
					<DragDropContext
						onDragEnd={({ destination, source }) => {
							form.reorderListItem('parameters', {
								from: source.index,
								to: destination.index,
							});
						}}
					>
						<div
							className='h-full grow-0 max-h-fit mb-4 overflow-y-scroll p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400'
							style={{ maxHeight: '60vh' }}

						>
							<Droppable
								as='div'
								droppableId='dnd-list'
								direction='vertical'
								// className='grow-0'
							>
								{(provided) => (
									<div {...provided.droppableProps} ref={provided.innerRef}>
										{props.children}
										{provided.placeholder}
									</div>
								)}
							</Droppable>
						</div>
					</DragDropContext>
				</div>
			</Fragment>
		</div>
	);
}

const ConfirmationStep = ({ form, ...props }) => {
	return (
		<div className='h-full overflow-y-scroll flex-0 grow-0 my-4 pl-4 rounded-md flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Code
				// className='overflow-y-scroll max-h-full' block
				className='h-full'
				block
			>
				{' '}
				{JSON.stringify(form.values, null, 2)}
			</Code>
		</div>
	);
};
const dropzoneKids = (status) => {
	if (status.accepted) {
		return <UploadIcon className={'bg-green-500'} status={status} />;
	}
	return (
		<div className={`flex flex-col justify-center items-center space-y-6`}>
			<UploadIcon status={status} />
			<div>
				<Text size='xl' inline>
					Upload your project executable.
				</Text>
				<Text size='sm' color='dimmed' inline mt={7}>
					Let's revolutionize science!
				</Text>
			</div>
		</div>
	);
};
const UploadIcon = ({ status }) => {
	if (status.accepted) {
		return <Upload size={80} />;
	} else if (status.rejected) {
		return <X size={80} />;
	}
	return <File size={80} />;
};

const DispatchStep = ({ id, form, ...props }) => {
	const { userId, authService } = useAuth();

	return (
		<Dropzone
			onDrop={async (file) => {
				console.log("Submitting Experiment!!!")
				submitExperiment(form.values, userId).then( (expId) =>{
					console.log(expId)

					console.log(`Uploading file for ${expId}`)
					const res = uploadExec(expId, file[0]);
					if (res == null) {
						throw new Error('Upload failed')
					} else{
						console.log("Handing experiment " + expId + " to the backend")
						fetch(`/api/experiments/${expId}`,{
							method: 'POST',
							headers: new Headers({ 'Content-Type': 'application/json'}),
							credentials: 'same-origin',
							body: JSON.stringify({id: expId})
						})
					}
				}).catch( error => console.log(error))
			}}
			onReject={(file) => console.log('NOPE, file rejected', file)}
			maxSize={3 * 1024 ** 2}
			className='flex-1 flex flex-col justify-center m-4 items-center'
			accept={{
				'text/plain': ['.py'],
				'application/java-archive':['.jar']
			  }}
		>
			{(status) =>  dropzoneKids(status)}
		</Dropzone>
	);
};

const NewExp = ({ formState, setFormState, ...rest }) => {
	const form = useForm({
		initialValues: {
			parameters: formList([]),
			name: '',
			description: '',
			fileOutput: '',
			resultOutput: '',
			verbose: true,
			nWorkers: 1,
		},
		schema: joiResolver(experimentSchema),
	});

	const fields = form.values.parameters.map(({ type, ...rest }, index) => {
		return <Parameter key = {index} form={form} type={type} index={index} {...rest} />;
	});

	const [open, setOpen] = useState(true);
	const [status, setStatus] = useState(0);
	const [id, setId] = useState(null);

	useLayoutEffect(() => {
		if (formState === 0) {
			setOpen(false);
		} else if (formState === 1) {
			setOpen(true);
		} else {
			setOpen(false);
			form.reset();
		}
	}, [formState]);

	return (
		<Transition.Root show={open} as={Fragment}>
			<Dialog
				as='div'
				className='fixed inset-0 overflow-hidden'
				onClose={() => setFormState(0)}
			>
				<div className='absolute inset-0 overflow-hidden'>
					<Dialog.Overlay className='absolute inset-0' />

					<div className='pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16'>
						<Transition.Child
							as={Fragment}
							enter='transform transition ease-in-out duration-500 sm:duration-700'
							enterFrom='translate-x-full'
							enterTo='translate-x-0'
							leave='transform transition ease-in-out duration-500 sm:duration-700'
							leaveFrom='translate-x-0'
							leaveTo='translate-x-full'
						>
							<div className='pointer-events-auto w-screen max-w-2xl'>
								<form
									className='flex h-full flex-col bg-white shadow-xl'
									onSubmit={form.onSubmit((values) => {
									})}
								>
									<div className='flex flex-col'>
										<div className='bg-gray-50 px-4 py-6 sm:px-6'>
											<div className='flex items-center align-center justify-between space-x-3'>
												<Steps 
													steps={['Information', 'Parameters', 'Confirmation', 'Dispatch'].map(
														(step, idx) => {
															return {
																id: idx + 1,
																name: step,
																status: status < idx ? 'upcoming' : 'complete',
															};
														}
													)}
												/>
											</div>
										</div>
									</div>

									{/* <div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'> */}
									{status === State.Info ? (
										<InformationStep form={form}></InformationStep>
									) : status === State.Params ? (
										<ParamStep form={form}>{fields}</ParamStep>
									) : status === State.Confirmation ? (
										<ConfirmationStep form={form} />
									) : (
										<DispatchStep form = {form} id={id} />
									)}

									<div className='flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6'>
										<div className='flex justify-end space-x-3'>
											<div className='flex space-x-3 flex-1'>
												<input
													type='number'
													placeholder={'N Workers'}
													className='rounded-md  border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
													required
													{...form.getInputProps('nWorkers')}
												/>
												<Toggle
													label={'Verbose?'}
													onChange={() => {
														form.setFieldValue('verbose', !form.values.verbose);
													}}
												/>
											</div>
											<button
												type='button'
												className='rounded-md border w-1/6 border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
												onClick={
													status === State.Info
														? () => {
																setFormState(-1);
														  }
														: () => {
																setStatus(status - 1);
														  }
												}
											>
												{status === State.Info ? 'Cancel' : 'Back'}
											</button>
											<button
												className='rounded-md w-1/6 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
												{...(status === State.Dispatch
													? { type: 'submit', onClick: () => {
                                                        setFormState(-1)
                                                        setStatus(State.Info)
                                                    }}
													: {
															type: 'button',
															onClick: () => setStatus(status + 1),
													  })}
											>
												{status === State.Dispatch ? 'Dispatch' : 'Next'}
											</button>
										</div>
									</div>
								</form>
							</div>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition.Root>
	);
};

export default NewExp;
