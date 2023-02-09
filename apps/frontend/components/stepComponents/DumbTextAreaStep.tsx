import { Fragment } from 'react';
import { InputSection } from '../InputSection';

export const DumbTextArea = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'User Constants'}>
					<div className='sm:col-span-4'>
						<p className='text-gray-500'>Enter additional constants to be appended to the bottom of the config file.</p>
						<p className='text-red-500 mb-2'>Disclaimer - these values are not validated, be sure to input them correctly!</p>
						<textarea
							{...form.getInputProps('dumbTextArea')}
							rows={10}
							placeholder='Set this up like a config.ini file'
							className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
			</Fragment>
		</div>
	);
};
