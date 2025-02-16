import { Fragment, useState, useEffect } from 'react';
import { Switch, ActionIcon, Center, Button, Modal } from '@mantine/core';
import { Draggable } from 'react-beautiful-dnd';
import { GripVertical, Plus, Tool } from 'tabler-icons-react';
import { TrashIcon as Trash } from '@heroicons/react/24/solid';
import { string } from 'joi';
import { Tooltip } from '@mantine/core';

const Parameter = ({ form, type, index, confirmedValues, setConfirmedValues, ...rest }) => {

	const [useDefault, setUseDefault] = useState(form.values.hyperparameters[index].useDefault || false);

	const remains = {
		string: StringParam,
		integer: NumberParam,
		float: NumberParam,
		bool: BoolParam,
		stringlist: MultiStringParam,
	};
	const Component = remains[type];

	const updateConfirmedValues = (index, newValues) => {

		const hasConfirmedValues = confirmedValues.some(item => item.index === index);
		if (hasConfirmedValues) {
			const newConfirmedValues = confirmedValues.map(item => {
				if (item.index === index) {
					return {
						index,
						values: newValues,
					};
				}
				return item;
			});
			setConfirmedValues(newConfirmedValues);
		} else {
			const newConfirmedValues = [...confirmedValues, { index, values: newValues }];
			setConfirmedValues(newConfirmedValues);
		}

	};

	useEffect(() => {
		if (form.values.hyperparameters[index].values && (form.values.hyperparameters[index].values.length != 1 && form.values.hyperparameters[index].values[0] != '')) {
			updateConfirmedValues(index, form.values.hyperparameters[index].values);
		}

		if (form.values.hyperparameters[index].default && form.values.hyperparameters[index].default != -1) {
			setUseDefault(true);
		}
		else {
			setUseDefault(false);
		}
	}, []);

	useEffect(() => {
		if (form.values.hyperparameters[index].useDefault == false) {
			form.setFieldValue(`hyperparameters.${index}.default`, -1);
		}
	}, [useDefault]);


	const handleRemove = () => {
		form.removeListItem('hyperparameters', index);
		const newConfirmedValues = confirmedValues.filter(item => item.index !== index);
		setConfirmedValues(newConfirmedValues);
	};

	const handleSwitchChange = () => {
		setUseDefault(!useDefault);
		// @ts-ignore
		if(`hyperparameters.${index}.default` != -1){
			form.setFieldValue(`hyperparameters.${index}.useDefault`, !useDefault);
		}
		else {
			form.setFieldValue(`hyperparameters.${index}.useDefault`, false);
		}


	};

	return (
		<Draggable key={index} index={index} draggableId={index.toString()} isDragDisabled={true}>

			{(provided) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					className='flex flex-col mb-2'
				>
					<div className='flex items-center'>
						<Center {...provided.dragHandleProps}>
							<GripVertical className='mr-2' />
						</Center>
						<span className='text-gray-500 mr-2'>{type}</span>
						<Tooltip label='Name of the parameter' position='top' withArrow>
						<input
							type='text'
							placeholder='name'
							className='block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
							{...form.getInputProps(`hyperparameters.${index}.name`)}
						/>
						</Tooltip>
						{useDefault && (
							<input
								type='text'
								placeholder='default'
								className='ml-2 block w-full last-of-type:rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
								{...form.getInputProps(`hyperparameters.${index}.default`)}
							/>
						)}

						<Component form={form} type={type} index={index} updateConfirmedValues={updateConfirmedValues} {...rest} />

						<div className='flex flex-col items-center ml-2'>
							<Switch
								checked={useDefault}
								onChange={handleSwitchChange}
								className={'ml-2'}
							/>
							<span className='text-sm text-gray-500'>Default?</span>
						</div>

						<ActionIcon
							color='red'
							onClick={handleRemove}
							className='ml-2'
						>
							<Trash />
						</ActionIcon>
					</div>
					{((confirmedValues?.find(item => item.index === index)?.values?.length ?? 0) > 0 && type === 'stringlist') && (
						<div className='mt-4 p-4 bg-gray-100 rounded-md shadow-sm'>
							<h3 className='text-lg font-medium text-gray-700 mb-2'>Values:</h3>
							{confirmedValues.find(item => item.index === index)?.values.map((value, idx) => (
								<div key={idx} className='flex items-center mb-2'>
									<span className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white'>
										{value}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</Draggable>
	);
};

const NumberParam = ({ form, type, index, ...rest }) => {
    return (
        <Fragment>
            {['min', 'max', 'step'].map((label, i) => {
                const tooltipText = {
                    min: 'Minimum value for the parameter',
                    max: 'Maximum value for the parameter',
                    step: 'Step value for the parameter',
                }[label];

                return (
                    <Fragment key={`number_${type}_${label}`}>
						<Tooltip label={tooltipText} position='top' withArrow>
                        <input
                            type='number'
                            placeholder={`${label}`}
                            className='block w-full last-of-type:rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
                            {...form.getInputProps(`hyperparameters.${index}.${label}`)}
                            data-tip={tooltipText}
                        />
						</Tooltip>
                    </Fragment>
                );
            })}
        </Fragment>
    );
};

const BoolParam = ({ form, type, index, ...rest }) => {
	return (
		<Switch
			label={'value'}
			onLabel={'True'}
			offLabel={'False'}
			{...form.getInputProps(`hyperparameters.${index}.default`)}
		/>
	);
};

const StringParam = ({ form, type, index, ...rest }) => {
	return (
		<>
		<Tooltip label='String value for the parameter' position='top' withArrow>
			<input
				type='text'
				placeholder={`${type} value`}
				className='block w-full rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
				{...form.getInputProps(`hyperparameters.${index}.default`)}
			/>
		</Tooltip>
		</>
	);
};

const MultiStringParam = ({ form, type, index, updateConfirmedValues, ...rest }) => {
	const [opened, setOpened] = useState(false);
	const [values, setValues] = useState(form.values.hyperparameters[index].values || ['']);

	const handleAddValue = () => {
		setValues([...values, '']);
		form.insertListItem(`hyperparameters[${index}].values`, '');
	};

	const handleChange = (e, idx) => {
		form.replaceListItem(`hyperparameters[${index}].values`, idx, e.target.value);

		const newValues = [...values];
		newValues[idx] = e.target.value;
		setValues(newValues);
	};

	const handleDelete = (idx) => {
		const newValues = values.filter((_, i) => i !== idx);
		setValues(newValues);

		const originalValues = form.values.hyperparameters[index]?.values || [];
		for (let i = originalValues.length - 1; i >= 0; i--) {
			if (!newValues.includes(originalValues[i])) {
				form.removeListItem(`hyperparameters[${index}].values`, i);
			}
		}

	};

	const handleClose = () => {
		setOpened(false);
	};

	const handleConfirm = () => {
		form.values.hyperparameters[index].values = values;
		updateConfirmedValues(index, values);
		setOpened(false);
	};

	const handleOpen = () => {
		setOpened(true);
	};

	return (
		<>
			<Button onClick={handleOpen} className='ml-2 rounded-md w-1/6 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
				Edit Strings
			</Button>
			<Modal
				opened={opened}
				onClose={handleClose}
				title="Edit String Values"
			>
				{values.map((value, idx) => {
					return (
						<div key={idx} className='flex items-center mb-2'>
							<Tooltip label='String value for the parameter' position='top' withArrow>
							<input
								type='text'
								placeholder={`Value ${idx + 1}`}
								className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								value={value}
								onChange={(e) => handleChange(e, idx)}
							/>
							</Tooltip>
							<ActionIcon onClick={() => handleDelete(idx)} color='red' className='ml-2'>
								<Trash />
							</ActionIcon>
						</div>
					);
				})}
				<ActionIcon onClick={handleAddValue} color='blue'>
					<Plus />
				</ActionIcon>
				<div className="flex justify-end mt-4">
					<button
						className='rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
						onClick={handleConfirm}
					>
						Confirm
					</button>
				</div>
			</Modal>
		</>
	);
};

export default Parameter;

