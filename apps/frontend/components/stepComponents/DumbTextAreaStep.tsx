import { Fragment } from 'react';
import { InputSection } from '../InputSection';

export const DumbTextArea = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Dumb Text Area'}>
					<div className='sm:col-span-4'>
						<textarea
							{...form.getInputProps('dumbTextArea')}
							rows={10}
							className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
			</Fragment>
		</div>
	);
};
