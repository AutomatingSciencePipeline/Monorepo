import { Fragment } from 'react';
import { Switch, ActionIcon, Center } from '@mantine/core';
import { Draggable } from 'react-beautiful-dnd';
import { GripVertical } from 'tabler-icons-react';
import { TrashIcon as Trash } from '@heroicons/react/24/solid';

const Parameter = ({ form, type, index, ...rest }) => {
	const remains = {
		string: StringParam,
		integer: NumberParam,
		float: NumberParam,
		bool: BoolParam,
	};
	const Component = remains[type];
	return (
		<Draggable key={index} index={index} draggableId={index.toString()}>
			{(provided) => {
				return (
					<div
						ref={provided.innerRef}
						{...provided.draggableProps}
						// className={'mt-8 justify-start'}
						className={'flex items-center mb-2'}
					>
						<Center {...provided.dragHandleProps}>
							<GripVertical className='mr-2' />
						</Center>
						<input
							type='text'
							placeholder={`${type}`}
							className='block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
							{...form.getListInputProps('parameters', index, 'name')}
							required
						/>
						<Component form={form} type={type} index={index} {...rest} />
						<ActionIcon
							color='red'
							onClick={() => form.removeListItem('parameters', index)}
							className='ml-2'
						>
							<Trash/>
						</ActionIcon>
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
						{...form.getListInputProps('parameters', index, label)}
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
			{...form.getListInputProps('parameters', index, 'default')}
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
				{...form.getListInputProps('parameters', index, 'default')}
				required
			/>
		</>
	);
};

export default Parameter;
