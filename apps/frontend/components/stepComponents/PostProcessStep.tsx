import { Fragment } from 'react';

import { InputSection } from '../InputSection';

export const PostProcessStep = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Scatter Plot'}>
					<div className='sm:col-span-4'>
						<input
							type='checkbox'
							checked={form.values.scatter}
							onChange={() => {
								form.setFieldValue('scatter', !form.values.scatter);
								if (!form.values.scatter) {
									form.setFieldValue('scatterIndVar', '');
									form.setFieldValue('scatterDepVar', '');
								}
							}}>
						</input>
					</div>
				</InputSection>

				{form.values.scatter ?
					<div>
						<InputSection header={'Independent Variable'}>
							<div className='sm:col-span-4'>
								<input
									type='text'
									placeholder=''
									{...form.getInputProps('scatterIndVar')}
									className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								/>
							</div>
						</InputSection>
						<InputSection header={'Dependant Variable'}>
							<div className='sm:col-span-4'>
								<input
									type='text'
									placeholder=''
									{...form.getInputProps('scatterDepVar')}
									className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								/>
							</div>
						</InputSection>
					</div> :
					''}
			</Fragment>
		</div>
	);
};
