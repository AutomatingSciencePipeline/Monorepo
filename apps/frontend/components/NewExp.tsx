import { Fragment, useState, useLayoutEffect, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Toggle } from './Toggle';
import Parameter from './Parameter';
import { useForm, formList, joiResolver } from '@mantine/form';
import { experimentSchema } from '../utils/validators';

import { firebaseApp } from '../firebase/firebaseClient';
import { getDoc, getFirestore, doc } from 'firebase/firestore';

import { DispatchStep } from './stepComponents/DispatchStep';
import { InformationStep } from './stepComponents/InformationStep';
import { ParamStep } from './stepComponents/ParamStep';
import { PostProcessStep } from './stepComponents/PostProcessStep';
import { ConfirmationStep } from './stepComponents/ConfirmationStep';
import { DumbTextArea } from './stepComponents/DumbTextAreaStep';

const DEFAULT_TRIAL_TIMEOUT_SECONDS = 5*60*60; // 5 hours in seconds

export const FormStates = {
	Closed: -1,
	Info: 0,
	Params: 1,
	DumbTextArea: 2,
	ProcessStep: 3,
	Confirmation: 4,
	Dispatch: 5,
};

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

const NewExp = ({ formState, setFormState, copyID, setCopyId, ...rest }) => {
	const form = useForm({
		initialValues: {
			parameters: formList([] as any[]), // TODO type for parameters will remove the need for `any` here
			name: '',
			description: '',
			trialExtraFile: '',
			trialResult: '',
			scatterIndVar: '',
			scatterDepVar: '',
			dumbTextArea: '',
			timeout: DEFAULT_TRIAL_TIMEOUT_SECONDS,
			verbose: false,
			scatter: false,
			keepLogs: true,
			nWorkers: 1,
		},
		schema: joiResolver(experimentSchema),
	});

	useEffect(() => {
		if (copyID != null) {
			const db = getFirestore(firebaseApp);
			getDoc(doc(db, 'Experiments', copyID)).then((docSnap) => {
				if (docSnap.exists()) {
					const expInfo = docSnap.data();
					let params;
					try {
						params = JSON.parse(expInfo['params'])['params'];
					} catch (error) {
						console.error(error);
						alert('Unexpected data encountered while copying experiment. Did you copy one with old settings?');
					}
					form.setValues({
						parameters: formList(params),
						name: expInfo['name'],
						description: expInfo['description'],
						trialExtraFile: expInfo['trialExtraFile'],
						trialResult: expInfo['trialResult'],
						verbose: expInfo['verbose'],
						nWorkers: expInfo['workers'],
						scatter: expInfo['scatter'],
						dumbTextArea: expInfo['consts'],
						scatterIndVar: expInfo['scatterIndVar'],
						scatterDepVar: expInfo['scatterDepVar'],
						timeout: expInfo['timeout'],
						keepLogs: expInfo['keepLogs'],
					});
					setCopyId(null);
					setStatus(FormStates.Info);
					console.log('Copied!');
				} else {
					console.log('No such document!');
				}
			});
		}
	}, [copyID]); // TODO adding form or setCopyId causes render loop?


	const fields = form.values.parameters.map(({ type, ...rest }, index) => {
		return <Parameter key = {index} form={form} type={type} index={index} {...rest} />;
	});

	const [open, setOpen] = useState(true);
	const [status, setStatus] = useState(0);
	const [id, setId] = useState(null);

	useLayoutEffect(() => {
		if (formState === FormStates.Info) {
			setOpen(false);
		} else if (formState === FormStates.Params) {
			setOpen(true);
		} else {
			setOpen(false);
			form.reset();
		}
	}, [formState]); // TODO adding 'form' causes an update loop

	return (
		<Transition.Root show={open} as={Fragment}>
			<Dialog
				as='div'
				className='fixed inset-0 overflow-hidden'
				onClose={() => setFormState(0)}
			>
				<div className='absolute inset-0 overflow-hidden'>
					<Dialog.Overlay className='absolute inset-0' />

					<div className='pointer-events-none fixed inset-y-0 right-0 flex pl-20 sm:pl-16'>
						<Transition.Child
							as={Fragment}
							enter='transform transition ease-in-out duration-500 sm:duration-700'
							enterFrom='translate-x-full'
							enterTo='translate-x-0'
							leave='transform transition ease-in-out duration-500 sm:duration-700'
							leaveFrom='translate-x-0'
							leaveTo='translate-x-full'
						>
							<div className='pointer-events-auto w-screen max-w-5xl'>
								<form
									className='flex h-full flex-col bg-white shadow-xl'
									onSubmit={form.onSubmit((values) => {
									})}
								>
									<div className='flex flex-col'>
										<div className='bg-gray-50 px-4 py-6 sm:px-6'>
											<div className='flex items-center align-center justify-between space-x-3'>
												<Steps
													steps={['Information', 'Parameters', 'User Defined Constants', 'Post Process', 'Confirmation', 'Dispatch'].map(
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
									{status === FormStates.Info ? (
										<InformationStep form={form}></InformationStep>
									) : status === FormStates.DumbTextArea ? (
										<DumbTextArea form={form}></DumbTextArea>
									) : status === FormStates.Params ? (
										<ParamStep form={form}>{fields}</ParamStep>
									) : status === FormStates.ProcessStep ? (
										<PostProcessStep form={form}>{fields}</PostProcessStep>
									) : status === FormStates.Confirmation ? (
										<ConfirmationStep form={form} />
									) : (
										<DispatchStep form = {form} id={id} />
									)}

									<div className='flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6'>
										<div className='flex justify-end space-x-3'>
											<div className='flex space-x-3 flex-1'>
												<input
													type='number'
													placeholder={'Number of Workers'}
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
													status === FormStates.Info ?
														() => {
															localStorage.removeItem('ID');
															setFormState(-1);
														} :
														() => {
															setStatus(status - 1);
														}
												}
											>
												{status === FormStates.Info ? 'Cancel' : 'Back'}
											</button>
											<button
												className='rounded-md w-1/6 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
												{...(status === FormStates.Dispatch ?
													{ type: 'submit', onClick: () => {
														setFormState(-1);
														localStorage.removeItem('ID');
														setStatus(FormStates.Info);
													} } :
													{
														type: 'button',
														onClick: () => setStatus(status + 1),
													})}
											>
												{status === FormStates.Dispatch ? 'Dispatch' : 'Next'}
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
