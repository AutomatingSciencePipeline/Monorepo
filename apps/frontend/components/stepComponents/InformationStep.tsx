import { Fragment } from 'react';
import { InputSection } from '../InputSection';

export const InformationStep = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Name'}>
					<div className='sm:col-span-4'>
						<input
							type='text'
							{...form.getInputProps('name')}
							className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>

				<InputSection header={'Description'}>
					<div className='sm:col-span-4'>
						<textarea
							{...form.getInputProps('description')}
							rows={3}
							className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>

				<InputSection header={'File Output'}>
					<div className='sm:col-span-4'>
						<input
							type='text'
							placeholder='Name and extension of the output CSV file'
							{...form.getInputProps('fileOutput')}
							className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
				<InputSection header={'Result Output'}>
					<div className='sm:col-span-4'>
						<input
							type='text'
							placeholder='Name and extension of the experiment results file'
							{...form.getInputProps('resultOutput')}
							className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
			</Fragment>
		</div>
	);
};
