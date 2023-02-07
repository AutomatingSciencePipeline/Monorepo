import { Fragment } from 'react';
import { InputSection } from '../InputSection';

export const DumbTextArea = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'User Consts'}>
					<div className='sm:col-span-4'>
						<span className='text-red'>Disclaimer! These values Are currently not validated, Be sure to input them correctly</span>
						<textarea
							{...form.getInputProps('dumbTextArea')}
							rows={10}
							placeholder='Set this up like a config file'
							className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
			</Fragment>
		</div>
	);
};
