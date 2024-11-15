import { Fragment, useState } from 'react';
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

	const handleConfirm = (values) => {
		const updatedValues = confirmedValues.map((item) =>
			item.index === index ? { ...item, values: values } : item
		);
		if (!updatedValues.some((item) => item.index === index)) {
			updatedValues.push({ index, values: values });
		}
		setConfirmedValues(updatedValues);

		const updatedHyperparameters = form.values.hyperparameters.map((param, idx) =>
			idx === index ? { ...param, values: values } : param
		);
		form.setFieldValue('hyperparameters', updatedHyperparameters);


	};

	const handleRemove = () => {
		setConfirmedValues(confirmedValues.filter(item => item.index !== index));
		form.removeListItem('hyperparameters', index);
		console.log('remove', index);
		console.log('hyperparams: ' + JSON.stringify(form.values.hyperparameters));
		//setDummyState(prev => !prev);
	};


	//const [dummyState, setDummyState] = useState(false);

	const currentConfirmedValues = confirmedValues.find((item) => item.index === index)?.values || [];

	return (
		<Draggable key={index} index={index} draggableId={index.toString()}>
			{(provided) => {
				return (
					<div>
						<div
							ref={provided.innerRef}
							{...provided.draggableProps}
							// className={'mt-8 justify-start'}
							className={'flex items-center mb-2'}
						>
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
							<Component form={form} type={type} index={index} onConfirm={handleConfirm} {...rest} />
							<ActionIcon
								color='red'
								onClick={handleRemove}
								className='ml-2'
							>
								<Trash />
							</ActionIcon>
						</div>
						{(currentConfirmedValues.length > 0 && type === 'stringlist') && (
							<div className='mt-4 p-4 bg-gray-100 rounded-md shadow-sm'>
								<h3 className='text-lg font-medium text-gray-700 mb-2'>Values:</h3>
								{currentConfirmedValues.map((value, idx) => (
									<div key={idx} className='flex items-center mb-2'>
										<span className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white'>
											{value}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				);
			}}
		</Draggable>
	);
};

const NumberParam = ({ form, type, index, ...rest }) => {
	return (
		<Fragment>
			{['default', 'min', 'max', 'step'].map((label, i) => {
				return (
					<input
						key={`number_${type}_${label}`}
						type='number'
						placeholder={`${label}`}
						className='block w-full last-of-type:rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm'
						required
						{...form.getListInputProps('hyperparameters', index, label)}
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

const MultiStringParam = ({ form, type, index, onConfirm, ...rest }) => {
	const [opened, setOpened] = useState(false);
	const [values, setValues] = useState(form.values.hyperparameters[index].values || ['']);
	const [name, setName] = useState(form.values.hyperparameters[index].name || '');
	

	const handleAddValue = () => {
		setValues([...values, '']);
	};

	const handleChange = (e, idx) => {
		const newValues = [...values];
		newValues[idx] = e.target.value;
		setValues(newValues);
	};

	const handleDelete = (idx) => {
		const newValues = values.filter((_, i) => i !== idx);
		setValues(newValues);
	};

	const handleClose = () => {
		// form.setFieldValue(`hyperparameters.${index}.values`, values);
		setOpened(false);
	};

	const handleConfirm = () => {
		onConfirm(values);
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
				{values.map((value, idx) => (
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
				))}
				<ActionIcon onClick={handleAddValue} color='blue'>
					<Plus />
				</ActionIcon>
				<button onClick={handleConfirm} className='mt-4 px-4 py-2 bg-blue-500 text-white rounded-md'>
					Confirm
				</button>
			</Modal>
		</>
	);
};

export default Parameter;

