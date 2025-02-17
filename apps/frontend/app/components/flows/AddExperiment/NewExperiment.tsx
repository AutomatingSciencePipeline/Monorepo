import { Fragment, useState, useLayoutEffect, useEffect } from 'react';
import { Dialog, Transition, TransitionChild } from '@headlessui/react';
import { Toggle } from '../../Toggle';
import Parameter from '../../Parameter';
import { useForm, joiResolver } from '@mantine/form';
import { experimentSchema } from '../../../../utils/validators';

import { DispatchStep } from './stepComponents/DispatchStep';
import { InformationStep } from './stepComponents/InformationStep';
import { ParamStep } from './stepComponents/ParamStep';
import { PostProcessStep } from './stepComponents/PostProcessStep';
import { ConfirmationStep } from './stepComponents/ConfirmationStep';
import { DumbTextArea } from './stepComponents/DumbTextAreaStep';
import { DB_COLLECTION_EXPERIMENTS, submitExperiment } from '../../../../lib/db';

import { copyFile, getDocumentFromId, refreshFileTimestamp, updateLastUsedDateFile } from '../../../../lib/mongodb_funcs';
import { useSession } from 'next-auth/react';
import toast, { Toaster } from 'react-hot-toast';
import { addNumsExpData, multistringPy, geneticalgo } from '../DefaultExperiments/ExpJSONs/DefaultExpJSONs';
import { useDebouncedCallback } from "use-debounce";

const DEFAULT_TRIAL_TIMEOUT_SECONDS = 5 * 60 * 60; // 5 hours in seconds

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

function selectDefaultExpFile(selectedExperiment: number) {
	switch (selectedExperiment) {
		case 1:
			return addNumsExpData;
		case 2:
			return multistringPy;
		case 3:
			return geneticalgo;
		default:
			return addNumsExpData;
	}
}



const NewExperiment = ({ formState, setFormState, copyID, setCopyId, isDefault, setIsDefault, selectedExperiment, ...rest }) => {
	const { data: session } = useSession();

	const [fileId, setFileId] = useState<string>();

	const [loading, setLoading] = useState(false);

	// Debounced function to handle selectedExperiment
	const debouncedHandleExperimentChange = useDebouncedCallback(async (selectedExperiment) => {
		// Call logic that requires selectedExperiment to be stable
		if (isDefault) {
			await handleDefaultExperiment(selectedExperiment);
		}
	}, 500); // Delay in ms (500ms in this example)

	useEffect(() => {
		// Call the debounced function whenever selectedExperiment changes
		debouncedHandleExperimentChange(selectedExperiment);
	}, [selectedExperiment]);

	const form = useForm({
		// TODO make this follow the schema as closely as we can
		initialValues: {
			hyperparameters: [] as any[], // TODO type for parameters will remove the need for `any` here
			name: '',
			description: '',
			trialExtraFile: '',
			trialResult: '',
			trialResultLineNumber: 0,
			scatterIndVar: '',
			scatterDepVar: '',
			dumbTextArea: '',
			timeout: DEFAULT_TRIAL_TIMEOUT_SECONDS,
			verbose: false,
			scatter: false,
			keepLogs: true,
			workers: 1,
			file: '',
			status: 'CREATED',
			experimentExecutable: '',
		},
		validate: joiResolver(experimentSchema),
	});

	useEffect(() => {
		if (copyID != null && copyID != "DefaultExp") {
			getDocumentFromId(copyID).then((expInfo) => {
				if (expInfo) {
					const hyperparameters = Array.isArray(expInfo['hyperparameters']) ? expInfo['hyperparameters'] : [];
					setFileId("");
					if (expInfo['creator'] !== session?.user?.id) {
						//We need to copy the file to the user's files and use the new ID
						copyFile(expInfo['file'], session?.user?.id!).then((newFileId) => {
							setFileId(newFileId);
							form.setValues({
								hyperparameters: hyperparameters,
								name: expInfo['name'],
								description: expInfo['description'],
								trialExtraFile: expInfo['trialExtraFile'],
								trialResult: expInfo['trialResult'],
								trialResultLineNumber: expInfo['trialResultLineNumber'],
								verbose: expInfo['verbose'],
								workers: expInfo['workers'],
								scatter: expInfo['scatter'],
								dumbTextArea: expInfo['dumbTextArea'],
								scatterIndVar: expInfo['scatterIndVar'],
								scatterDepVar: expInfo['scatterDepVar'],
								timeout: expInfo['timeout'],
								keepLogs: expInfo['keepLogs'],
								file: newFileId,
								status: 'CREATED',
								experimentExecutable: expInfo['experimentExecutable'],
							});
							setCopyId(null);
							setStatus(FormStates.Info);
						});

					}
					else {
						refreshFileTimestamp(expInfo['file']).then(() => {
							form.setValues({
								hyperparameters: hyperparameters,
								name: expInfo['name'],
								description: expInfo['description'],
								trialExtraFile: expInfo['trialExtraFile'],
								trialResult: expInfo['trialResult'],
								trialResultLineNumber: expInfo['trialResultLineNumber'],
								verbose: expInfo['verbose'],
								workers: expInfo['workers'],
								scatter: expInfo['scatter'],
								dumbTextArea: expInfo['dumbTextArea'],
								scatterIndVar: expInfo['scatterIndVar'],
								scatterDepVar: expInfo['scatterDepVar'],
								timeout: expInfo['timeout'],
								keepLogs: expInfo['keepLogs'],
								file: expInfo['file'],
								status: 'CREATED',
								experimentExecutable: expInfo['experimentExecutable'],
							});
							setFileId(expInfo['file']);
							setCopyId(null);
							setStatus(FormStates.Info);
						});
					}

				}
				else {
					console.warn("Could not get expInfo!!!");
				}
			})
		}
		else if (isDefault) {
			handleDefaultExperiment(selectedExperiment);
		}
	}, [copyID]); // TODO adding form or setCopyId causes render loop?

	const handleDefaultExperiment = async (selectedExperiment) => {
		setLoading(true);
		const currentExp = selectDefaultExpFile(selectedExperiment);
		const expInfo = currentExp;
		const hyperparameters = Array.isArray(expInfo['hyperparameters']) ? expInfo['hyperparameters'] : [];

		// Handle the raw GitHub link
		const fileUrl = currentExp.file;
		if (fileUrl) {
			debouncedUploadFile(fileUrl);
		} else {
			console.warn('No valid link provided in the form.');
			setLoading(false);
		}

		form.setValues({
			hyperparameters: hyperparameters,
			name: expInfo['name'],
			description: expInfo['description'],
			trialExtraFile: expInfo['trialExtraFile'],
			trialResult: expInfo['trialResult'],
			verbose: expInfo['verbose'],
			workers: expInfo['workers'],
			scatter: expInfo['scatter'],
			dumbTextArea: expInfo['dumbTextArea'],
			scatterIndVar: expInfo['scatterIndVar'],
			scatterDepVar: expInfo['scatterDepVar'],
			timeout: expInfo['timeout'],
			status: 'CREATED',
			keepLogs: expInfo['keepLogs'],
			experimentExecutable: '',
		});

		setCopyId(null);
		setStatus(FormStates.Info);
	};

	// Debounced API call
	const debouncedUploadFile = useDebouncedCallback(async (fileUrl) => {
		try {
			const response = await fetch(fileUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch file: ${response.statusText}`);
			}

			const blob = await response.blob();
			const fileName = fileUrl.split('/').pop() || 'uploadedFile.tsx';

			const formData = new FormData();
			formData.append("file", blob, fileName);
			formData.append("userId", session?.user?.id!);

			const uploadFileResponse = await fetch('/api/files/uploadFile', {
				method: 'POST',
				credentials: 'same-origin',
				body: formData,
			});


			if (uploadFileResponse.ok) {
				const json = await uploadFileResponse.json();
				const fileId = json['fileId'];
				setFileId(fileId);

				form.setFieldValue('file', fileId);
			} else {
				const errorJson = await uploadFileResponse.json();
				console.error(`Failed to upload file: ${errorJson['message']}`);
			}
		} catch (error) {
			console.error(`Error processing the file: ${error.message}`);
		}
		setLoading(false);
	}, 500); // 500ms delay


	const [confirmedValues, setConfirmedValues] = useState<{ index: number, values: any[] }[]>([]);


	const fields = form.values.hyperparameters.map(({ type, ...rest }, index) => {
		return <Parameter key={index} form={form} type={type} index={index} confirmedValues={confirmedValues} setConfirmedValues={setConfirmedValues} {...rest} />;
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

	const [validationErrors, setValidationErrors] = useState({
		name: false,
		trialResult: false,
	});

	const validateParams = () => {
		const errors = form.values.hyperparameters.map((param) => {
			if (param.name === '' || param.type === '') {
				toast.error("Please fill out all fields for the hyperparameters!", {duration: 1500});
				return false;
			}
			if (param.type === 'integer' || param.type === 'float') {
				const min = parseFloat(param.min);
				const max = parseFloat(param.max);
				const step = parseFloat(param.step);
				if (isNaN(min) || isNaN(max) || isNaN(step)) {
					toast.error(`Invalid number format for parameter ${param.name}`, { duration: 1500 });
					return false;
				}
				if (min >= max) {
					toast.error(`Minimum value should be less than maximum value for the following parameter: ${param.name}`, { duration: 1500 });
					return false;
				}
				if (step <= 0) {
					toast.error(`Step size should be greater than 0 for parameter ${param.name}`, { duration: 1500 });
					return false;
				}
				return true;
			}
			if (param.type === 'string') {
				return param.default !== '';
			}
			if (param.type === 'stringlist') {
				return param.values.length > 0;
			}
			return true;
		});
		return errors;
	};

	const validateFields = () => {
        const errors = {
            name: !form.values.name,
            trialResult: !form.values.trialResult,
        };
        setValidationErrors(errors);
        return !errors.name && !errors.trialResult;
    };

	const handleNext = () => {
        if (status === FormStates.Info) {
            const isValid = validateFields();
            if (!isValid) {
				toast.error("Please fill out name and trial result fields!", {duration: 1500});
                return;
            }
        }
		if (status === FormStates.Params) {
			const isValid = validateParams();
			if (!isValid.includes(false)) {
				setStatus((prevStatus) => prevStatus + 1);
			}
			return;
		}
        // Proceed to the next step
        setStatus((prevStatus) => prevStatus + 1);
    };

	return (
		<div>
			<Toaster />
			<Transition show={open} as={Fragment}>
				<Dialog
					as='div'
					className='fixed inset-0 overflow-hidden'
					onClose={() => setFormState(0)}
				>
					<div className='absolute inset-0 overflow-hidden'>
						<div className='absolute inset-0' />

						<div className='pointer-events-none fixed inset-y-0 right-0 flex pl-20 sm:pl-16'>
							<TransitionChild
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
											<InformationStep form={form} validationErrors={validationErrors} setValidationErrors={setValidationErrors}></InformationStep>
										) : status === FormStates.DumbTextArea ? (
											<DumbTextArea form={form}></DumbTextArea>
										) : status === FormStates.Params ? (
											<ParamStep form={form} confirmedValues={confirmedValues} setConfirmedValues={setConfirmedValues}>{fields}</ParamStep>
										) : status === FormStates.ProcessStep ? (
											<PostProcessStep form={form}>{fields}</PostProcessStep>
										) : status === FormStates.Confirmation ? (
											<ConfirmationStep form={form} />
										) : (
											<DispatchStep form={form} id={id} fileId={fileId} updateId={setFileId} fileLink={undefined} isDefault={isDefault} />
										)}

										<div className='flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6'>
											<div className='flex justify-end space-x-3'>
												<div className='flex space-x-3 flex-1'>
													<input
														type='number'
														placeholder={'Number of Workers'}
														className='rounded-md  border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
														required
														{...form.getInputProps('workers')}
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
																setIsDefault(false);
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
														{
															type: 'submit', onClick: () => {
																if (fileId != null && fileId.length > 0) {
																	setFormState(-1);
																	localStorage.removeItem('ID');
																	setStatus(FormStates.Info);
																	setIsDefault(false);
																	submitExperiment(form.values as any, session?.user?.id as string, session?.user?.email as string, session?.user?.role as string, fileId).then(async (json) => {
																		const expId = json['id'];
																		const response = await fetch(`/api/experiments/start/${expId}`, {
																			method: 'POST',
																			headers: new Headers({ 'Content-Type': 'application/json' }),
																			credentials: 'same-origin',
																			body: JSON.stringify({ id: expId }),
																		});
																		if (response.ok) {
																			toast.success("Started experiment!", { duration: 1500 });
																		}
																		else {
																			toast.error("Failed to start experiment!", { duration: 1500 });
																		}
																	}).then(() => {
																		//Use this to set the new last used date of the file
																		updateLastUsedDateFile(fileId);
																	}).catch((error) => {
																		toast.error(`Error while starting experiment: ${error}`, { duration: 1500 });
																	});
																	setFileId("");
																}
																else {
																	toast.error("No file selected!", { duration: 1500 })
																}
															}
														} :
														{
															type: 'button',
															onClick: () => {
																if (!loading) {
																	handleNext();
																}
																else {
																	toast.error("Still setting up... wait a couple seconds and try again.", { duration: 2500 });
																}
															},
														})}
												>
													{status === FormStates.Dispatch ? 'Dispatch' : 'Next'}
												</button>
											</div>
										</div>
									</form>
								</div>
							</TransitionChild>
						</div>
					</div>
				</Dialog>
			</Transition>
		</div>
	);
};

export default NewExperiment;


