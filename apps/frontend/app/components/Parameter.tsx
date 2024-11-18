import { Fragment, useState, useEffect } from 'react';
import { Switch, ActionIcon, Center, Button, Modal } from '@mantine/core';
import { Draggable } from 'react-beautiful-dnd';
import { GripVertical, Plus } from 'tabler-icons-react';
import { TrashIcon as Trash } from '@heroicons/react/24/solid';
import { string } from 'joi';

const Parameter = ({ form, type, index, confirmedValues, setConfirmedValues, ...rest }) => {
	const remains = {
		string: StringParam,
		integer: NumberParam,
		float: NumberParam,
		bool: BoolParam,
		stringlist: MultiStringParam,
	};
	const Component = remains[type];

	const updateConfirmedValues = (index, newValues) => {
	
        // Update confirmed values
        let updatedValues = confirmedValues?.map((item) =>
            item.index === index ? { ...item, values: newValues } : item
        ) || [];

        if (!updatedValues.some((item) => item.index === index)) {
            updatedValues.push({ index, values: newValues });
        }

        setConfirmedValues(updatedValues);
		
	};

	useEffect(() => {
		console.log('confirmedValues:', confirmedValues);
		console.log('hyperparameters:', form.values.hyperparameters);
	}
	, [confirmedValues, form.values.hyperparameters]);

	const handleRemove = () => {
		const hasConfirmedValues = confirmedValues.some(item => item.index === index);
		if (hasConfirmedValues) {
			const newConfirmedValues = confirmedValues.filter(item => item.index !== index);
			setConfirmedValues(newConfirmedValues);

		}
		// Remove the hyperparameter at this index using removeListItem
		form.removeListItem('hyperparameters', index);
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
						<Component form={form} type={type} index={index} updateConfirmedValues={updateConfirmedValues} {...rest} />
						
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
			{['default', 'min', 'max', 'step'].map((label, i) => {
				
				//console.log('inputProps for index: ', index);
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
	const [values, setValues] = useState(form.values.hyperparameters[index]?.values || ['']);

	const handleAddValue = () => {
		setValues([...values, '']);
	};

	const handleChange = (e, idx) => {
		const newValues = [...values];
		newValues[idx] = e.target.value;
		setValues(newValues);
		console.log('newValues:', values);
	};

	const handleDelete = (idx) => {
		const newValues = values.filter((_, i) => i !== idx);
		setValues(newValues);
	
		// Remove the list items that have been removed from the values list
		const originalValues = form.values.hyperparameters[index]?.values || [];
		for (let i = originalValues.length - 1; i >= 0; i--) {
			if (!newValues.includes(originalValues[i])) {
				form.removeListItem(`hyperparameters[${index}].values`, i);
			}
		}
	
		console.log('after delete:', form.values.hyperparameters[index].values);
	};

	const handleClose = () => {
		setOpened(false);
	};

	const handleConfirm = () => {
		updateConfirmedValues(index, values);
		console.log("before: ", form.values.hyperparameters[index].values);
		form.setFieldValue(`hyperparameters[${index}].values`, values);
		console.log("after: ", form.values.hyperparameters[index].values);
		setOpened(false);
	};

	return (
		<>
			<Button onClick={() => setOpened(true)} className='ml-2 rounded-md w-1/6 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
				Edit Strings
			</Button>
			<Modal
				opened={opened}
				onClose={handleClose}
				title="Edit String Values"
			>
				{values.map((value, idx) => {
					const inputProps = form.getInputProps(`hyperparameters.${index}.values.${idx}`);
					return (
						<div key={idx} className='flex items-center mb-2'>
							<input
								type='text'
								placeholder={`Value ${idx + 1}`}
								className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								value={value}
								onChange={(e) => handleChange(e, idx)}
								{...inputProps}
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
				<div>
					<button
						className='rounded-md w-1/6 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap'
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

