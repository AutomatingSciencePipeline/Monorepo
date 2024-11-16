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

	const updateConfirmedValues = (index, values) => {
		let updatedValues = confirmedValues?.map((item) =>
			item.index === index ? { ...item, values: values } : item
		) || [];
		if (!updatedValues.some((item) => item.index === index)) {
			updatedValues.push({ index, values: values });
		}
		setConfirmedValues(updatedValues);
	}


	// const handleConfirm = (values) => {
	// 	let updatedValues = confirmedValues?.map((item) =>
	// 		item.index === index ? { ...item, values: values } : item
	// 	) || [];
	// 	if (!updatedValues.some((item) => item.index === index)) {
	// 		updatedValues.push({ index, values: values });
	// 	}
	// 	setConfirmedValues(updatedValues);

	// 	if (values.length === 0) {
	// 		return;
	// 	}

	// 	const updatedHyperparameters = form.values.hyperparameters.map((param, idx) =>
	// 		idx === index ? { ...param, values: values } : param
	// 	);
	// 	form.setFieldValue('hyperparameters', updatedHyperparameters);
	// };

	// const getListInputProps = (field, index, subField) => {
	// 	console.log("in custom getListInputProps");
	// 	console.log('field:', field);
	// 	console.log('index:', index);
	// 	console.log('subField:', subField);
	// 	return {
	// 		name: `${field}[${index}].${subField}`,
	// 		value: form.values[field][index][subField],
	// 		onChange: (e) => form.setFieldValue(`${field}[${index}].${subField}`, e.target.value),
	// 	};
	// };

	// form.getListInputProps = getListInputProps;

	const handleRemove = () => {
		// Check if there are any confirmed values at this index
		const hasConfirmedValues = confirmedValues.some(item => item.index === index);
		if (hasConfirmedValues) {
			// Remove the confirmed values at this index
			console.log('confirmedValues before remove:', confirmedValues);
			const newConfirmedValues = confirmedValues.filter(item => item.index !== index);
			setConfirmedValues(newConfirmedValues);
			console.log('confirmedValues after remove:', newConfirmedValues);
		}
		// Remove the hyperparameter at this index using removeListItem
		console.log('form.values.hyperparameters before remove:', form.values.hyperparameters);
		form.removeListItem('hyperparameters', index);
		console.log('form.values.hyperparameters after remove:', form.values.hyperparameters);
	};

	useEffect(() => {
		console.log('confirmedValues:', confirmedValues);
		console.log('hyperparameters:', form.values.hyperparameters);
	}, [confirmedValues, form.values.hyperparameters]);

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
							{...form.getListInputProps('hyperparameters', index, 'name')}
							required
						/>
						{/* <Component form={form} type={type} index={index} onConfirm={handleConfirm} {...rest} /> */}
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
				const inputProps = form.getListInputProps('hyperparameters', index, label);
				console.log('inputProps for index: ', index, inputProps);
				return (
					<input
						key={`number_${type}_${label}`}
						type='number'
						placeholder={`${label}`}
						className='block w-full last-of-type:rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
						required
						{...inputProps}
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
			{...form.getListInputProps('hyperparameters', index, 'default')}
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
				{...form.getListInputProps('hyperparameters', index, 'default')}
				required
			/>
		</>
	);
};

const MultiStringParam = ({ form, type, index, updateConfirmedValues, ...rest }) => {
	const [opened, setOpened] = useState(false);
	const [values, setValues] = useState(form.values.hyperparameters[index].values || ['']);

	const handleAddValue = () => {
		setValues([...values, '']);
	};

	const handleChange = (e, idx) => {
		const newValues = [...values];
		newValues[idx] = e.target.value;
		setValues(newValues);
		console.log('newValues:', newValues);
	};

	const handleDelete = (idx) => {
		const newValues = values.filter((_, i) => i !== idx);
		setValues(newValues);
	};

	const handleClose = () => {
		// const updatedHyperparameters = [...form.values.hyperparameters];
		// updatedHyperparameters[index].values = values;
		// form.setFieldValue('hyperparameters', updatedHyperparameters);
		// const updatedHyperparameters = form.values.hyperparameters.map((param, idx) =>
		// 	idx === index ? { ...param, values: values } : param
		// );
		// form.setFieldValue('hyperparameters', updatedHyperparameters);

		 // Create a copy of the hyperparameters array
		 const updatedHyperparameters = [...form.values.hyperparameters];

		 // Update the values of the specific hyperparameter
		 updatedHyperparameters[index].values = values;
	 
		 // Set the updated array back to the form's values
		 form.values.hyperparameters = updatedHyperparameters;

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
					const inputProps = form.getListInputProps('hyperparameters', index, `values[${idx}]`);
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
			</Modal>
		</>
	);
};

export default Parameter;

