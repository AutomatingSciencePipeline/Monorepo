import { Fragment, useState, useEffect } from 'react';
import { Switch, ActionIcon, Center, Button, Modal } from '@mantine/core';
import { Draggable } from 'react-beautiful-dnd';
import { GripVertical, Plus } from 'tabler-icons-react';
import { TrashIcon as Trash } from '@heroicons/react/24/solid';
import { string } from 'joi';

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
						<input
							type='text'
							placeholder='name'
							className='block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
							{...form.getInputProps(`hyperparameters.${index}.name`)}
							required
						/>
						{useDefault && (
							<input
								type='text'
								placeholder='default'
								className='ml-2 block w-full last-of-type:rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
								{...form.getInputProps(`hyperparameters.${index}.default`)}
								required
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

				return (
					<input
						key={`number_${type}_${label}`}
						type='number'
						placeholder={`${label}`}
						className='block w-full last-of-type:rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
						required
						{...form.getInputProps(`hyperparameters.${index}.${label}`)}
					/>
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
			<input
				type='text'
				placeholder={`${type} value`}
				className='block w-full rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
				{...form.getInputProps(`hyperparameters.${index}.default`)}
				required
			/>
		</>
	);
};

const MultiStringParam = ({ form, type, index, updateConfirmedValues, ...rest }) => {
	const [opened, setOpened] = useState(false);
	const [values, setValues] = useState(form.values.hyperparameters[index].values || ['']);

	useEffect(() => {
		console.log('Updated values:', values);
	}, [values]);

	const handleAddValue = () => {
		setValues([...values, '']);
		form.insertListItem(`hyperparameters[${index}].values`, '');
	};

	const handleChange = (e, idx) => {
		console.log('replacing list item:', idx, e.target.value);
		form.replaceListItem(`hyperparameters[${index}].values`, idx, e.target.value);
		console.log('after replace:', form.values.hyperparameters[index].values);
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
				console.log('deleting:', originalValues[i]);
				form.removeListItem(`hyperparameters[${index}].values`, i);
			}
		}

		console.log('after delete:', form.values.hyperparameters[index].values);
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
							<input
								type='text'
								placeholder={`Value ${idx + 1}`}
								className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								value={value}
								onChange={(e) => handleChange(e, idx)}
								required
							/>
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

