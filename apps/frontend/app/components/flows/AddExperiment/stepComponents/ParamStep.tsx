'use client'

import { Fragment, useState } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { InputSection } from '../../../InputSection';
//import { formList } from '@mantine/form';

export const ParameterOptions = ['integer', 'float', 'bool', 'string', 'stringlist'] as const;

export const ParamStep = ({ form, confirmedValues, setConfirmedValues, ...props }) => {

	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Parameters'}>
					<div className='sm:col-span-4 inline-flex'>
						<span className='rounded-l-md text-sm text-white font-bold bg-blue-600  items-center px-4 py-2 border border-transparent'>
							+
						</span>
						<span className='relative z-0 inline-flex flex-1 shadow-sm rounded-md'>
							{ParameterOptions.map((type) => (
								<button
									type='button'
									key={`addNew_${type}`}
									className='-ml-px relative items-center flex-1 px-6 py-2 last:rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:border-blue-500'
									onClick={() =>{
										console.log("add new item" + type + " to hyperparameters")
										form.insertListItem('hyperparameters', {
											name: '',
											default: '',
											...((type === 'stringlist') && { values: [''] }),
											...((type === 'integer' || type === 'float') && {
												min: '',
												max: '',
												step: '',
											}),
											type: type,
										})
									}}
								>
									{type}
								</button>
							))}
						</span>
					</div>
				</InputSection>

				<div className={'flex-0 p-4 h-full grow-0'}>
					<DragDropContext>
						<div
							className='h-full grow-0 max-h-fit mb-4 overflow-y-scroll p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400'
							style={{ maxHeight: '60vh' }}

						>
							<Droppable
								as='div'
								droppableId='dnd-list'
								direction='vertical'
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
};
