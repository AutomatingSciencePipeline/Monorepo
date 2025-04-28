import { Fragment, useState, useEffect } from 'react';
import { Switch, ActionIcon, Center, Button, Modal } from '@mantine/core';
import { GripVertical, Plus, Tool } from 'tabler-icons-react';
import { TrashIcon as Trash } from '@heroicons/react/24/solid';
import { string } from 'joi';
import { Tooltip } from '@mantine/core';
import { toast } from 'react-hot-toast';

const Parameter = ({ form, type, index, confirmedValues, setConfirmedValues, confirmedParamGroups, setConfirmedParamGroups, ...rest }) => {

	const [useDefault, setUseDefault] = useState(form.values.hyperparameters[index].useDefault || false);

	const remains = {
		string: StringParam,
		integer: NumberParam,
		float: NumberParam,
		bool: BoolParam,
		stringlist: MultiStringParam,
		paramgroup: ParamGroup,
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

	const updateConfirmedParamValues = (index, newValues) => {
		const hasConfirmedValues = confirmedParamGroups.some(item => item.index === index);
		if (hasConfirmedValues) {
			const newConfirmedValues = confirmedParamGroups.map(item => {
				if (item.index === index) {
					return {
						index,
						values: newValues,
					};
				}
				return item;
			});
			setConfirmedParamGroups(newConfirmedValues);
		} else {
			const newConfirmedValues = [...confirmedParamGroups, { index, values: newValues }];
			setConfirmedParamGroups(newConfirmedValues);
		}
	};



	useEffect(() => {
		if (form.values.hyperparameters[index].values && (form.values.hyperparameters[index].values.length != 1 && form.values.hyperparameters[index].values[0] != '')) {
			updateConfirmedValues(index, form.values.hyperparameters[index].values);
		}

		if (form.values.hyperparameters[index].values && Object.keys(form.values.hyperparameters[index].values).length > 0) {
			updateConfirmedParamValues(index, form.values.hyperparameters[index].values);
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
		const newConfirmedParamGroups = confirmedParamGroups.filter(item => item.index !== index);
		setConfirmedParamGroups(newConfirmedParamGroups);
	};

	const handleSwitchChange = () => {
		setUseDefault(!useDefault);
		// @ts-ignore
		if (`hyperparameters.${index}.default` != -1) {
			form.setFieldValue(`hyperparameters.${index}.useDefault`, !useDefault);
		}
		else {
			form.setFieldValue(`hyperparameters.${index}.useDefault`, false);
		}


	};

	return (

		<div className='flex flex-col mb-2'>
			<div className='flex items-center'>

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

				<Component
					form={form}
					type={type}
					index={index}
					updateConfirmedValues={updateConfirmedValues}
					updateConfirmedParamValues={updateConfirmedParamValues}
					{...rest}
				/>

				{type !== 'paramgroup' && (
					<div className='flex flex-col items-center ml-2'>
						<Switch
							checked={useDefault}
							onChange={handleSwitchChange}
							className='ml-2'
						/>
						<span className='text-sm text-gray-500'>Default?</span>
					</div>
				)}

				<ActionIcon
					color='red'
					onClick={handleRemove}
					className='ml-2'
				>
					<Trash />
				</ActionIcon>
			</div>

			{/* Render confirmed stringlist values */}
			{(confirmedValues?.find(item => item.index === index)?.values?.length ?? 0) > 0 && type === 'stringlist' && (
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

			{/* Render confirmed param groups */}
			{(confirmedParamGroups?.find(item => item.index === index)?.values && Object.keys(confirmedParamGroups.find(item => item.index === index)?.values || {}).length > 0 && type === 'paramgroup') && (
				<div className='mt-4 p-4 bg-gray-100 rounded-md shadow-sm'>
					<h3 className='text-lg font-medium text-gray-700 mb-2'>Parameter Groups:</h3>
					<table className='min-w-full bg-white'>
						<thead>
							<tr>
								<th className='py-2'>Key</th>
								<th className='py-2'>Values</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(confirmedParamGroups.find(item => item.index === index)?.values || {}).map(([key, values]) => (
								<tr key={key}>
									<td className='border px-4 py-2'>{key}</td>
									<td className='border px-4 py-2'>
										{Array.isArray(values) && values.map((value, idx) => (
											<div key={idx} className='mb-2'>
												{value}
											</div>
										))}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
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

const ParamGroup = ({ form, type, index, updateConfirmedParamValues, ...rest }) => {
	const [opened, setOpened] = useState(false);
	const [newColumnModalOpened, setNewColumnModalOpened] = useState(false);
	const [newColumnName, setNewColumnName] = useState('');
	const [values, setValues] = useState(form.values.hyperparameters[index].values || {});
	const [variableNames, setVariableNames] = useState<string[]>([]);

	const handleAddRow = () => {
		const newValues = { ...values };
		variableNames.forEach(name => {
			if (!newValues[name]) {
				newValues[name] = [];
			}
			newValues[name].push('');
		});
		setValues(newValues);
	};

	const handleDeleteRow = (rowIdx) => {
		const newValues = { ...values };
		variableNames.forEach(name => {
			if (newValues[name]) {
				newValues[name] = newValues[name].filter((_, i) => i !== rowIdx);
			}
		});
		setValues(newValues);
	};

	const handleDeleteColumn = (colIdx) => {
		const newVariableNames = variableNames.filter((_, idx) => idx !== colIdx);
		setVariableNames(newVariableNames);

		const newValues = { ...values };
		const columnName = variableNames[colIdx];
		delete newValues[columnName];
		setValues(newValues);
	};

	const handleChange = (e, colName, rowIdx) => {
		const newValues = { ...values };
		newValues[colName][rowIdx] = e.target.value;
		setValues(newValues);
	};

	const handleConfirm = () => {
		form.values.hyperparameters[index].values = values;
		updateConfirmedParamValues(index, values);
		setOpened(false);
	};

	const handleVariableNameChange = (e, idx) => {
		const newVariableNames = [...variableNames];
		const oldName = variableNames[idx];
		const newName = e.target.value;

		if (oldName !== newName) {
			const newValues = { ...values };
			newValues[newName] = newValues[oldName] || [];
			delete newValues[oldName];
			setValues(newValues);
		}

		newVariableNames[idx] = newName;
		setVariableNames(newVariableNames);
	};

	const handleEdit = () => {
		if (Object.keys(values).length > 0) {
			const names = Object.keys(values);
			setVariableNames(names);
			setOpened(true);
		} else {
			setOpened(true);
		}
	};

	const handleAddColumn = () => {
		setNewColumnModalOpened(true);
	};

	const handleNewColumnSubmit = () => {
		if (variableNames.includes(newColumnName)) {
			toast.error('Column name already exists', {
				duration: 1000,
			});
			return;
		}
		const newVariableNames = [...variableNames, newColumnName];
		const newValues = { ...values, [newColumnName]: Array(values[variableNames[0]]?.length || 0).fill('') };
		setVariableNames(newVariableNames);
		setValues(newValues);
		setNewColumnModalOpened(false);
		setNewColumnName('');
	};

	return (
		<>
			<Button onClick={() => handleEdit()} className='ml-2 rounded-md w-1/6 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
				Edit Param Group
			</Button>
			<Modal opened={opened} onClose={() => setOpened(false)} title="Edit Params and Values" styles={{
				modal: {
					width: '30%', // Adjust the width as needed
					maxWidth: 'none', // Ensure the modal can grow beyond the default max width
				},
			}}>
				<table className='min-w-full bg-white'>
					<thead>
						<tr>
							{variableNames.map((name, idx) => (
								<th key={idx} className='py-2'>
									<ActionIcon key={idx} onClick={() => handleDeleteColumn(idx)} color='red' className='ml-2'>
										<Trash />
									</ActionIcon>
									<input
										type='text'
										placeholder={`Variable ${idx + 1}`}
										className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
										value={name}
										onChange={(e) => handleVariableNameChange(e, idx)}
										required
										readOnly
									/>
								</th>
							))}
							<th className='py-2'>Actions</th>
						</tr>
					</thead>
					<tbody>
						{values[variableNames[0]]?.map((_, rowIdx) => (
							<tr key={rowIdx}>
								{variableNames.map((name, colIdx) => (
									<td key={colIdx} className='border px-4 py-2'>
										<input
											type='text'
											placeholder={`Value ${colIdx + 1}`}
											className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
											value={values[name][rowIdx]}
											onChange={(e) => handleChange(e, name, rowIdx)}
											required
										/>
									</td>
								))}
								<td className='border px-4 py-2'>
									<ActionIcon onClick={() => handleDeleteRow(rowIdx)} color='red' className='ml-2'>
										<Trash />
									</ActionIcon>
								</td>
							</tr>
						))}
						<tr>
							<td colSpan={variableNames.length} className='border px-4 py-2'>
								<Button
									onClick={handleAddRow}
									className='w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
									disabled={variableNames.length === 0}
								>
									Add Row
								</Button>
							</td>
						</tr>
					</tbody>
				</table>
				<div className='flex justify-between mt-4'>
					<Button onClick={handleAddColumn} className='rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
						Add Column
					</Button>
					<Button onClick={handleConfirm} className='rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
						Confirm
					</Button>
				</div>
			</Modal>
			<Modal opened={newColumnModalOpened} onClose={() => setNewColumnModalOpened(false)} title="Add New Column">
				<div className='flex flex-col items-center'>
					<input
						type='text'
						placeholder='New Column Name'
						className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						value={newColumnName}
						onChange={(e) => setNewColumnName(e.target.value)}
						required
					/>
					<Button onClick={handleNewColumnSubmit} className='mt-4 rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
						Add Column
					</Button>
				</div>
			</Modal>
		</>
	);
};

export default Parameter;

