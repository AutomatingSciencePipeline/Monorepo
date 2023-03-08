import { Fragment } from 'react';
import { InputSection } from '../InputSection';

const PLACEHOLDER_TEXT = `; Example of what you could paste in here (sections and comments supported)
[const]
a = -1
;test comment
b = 10.5
invert = False
[Strings]
c = Test String`;

export const DumbTextArea = ({ form, ...props }) => {
	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'User Constants'}>
					<div className='sm:col-span-4'>
						<p className='text-gray-500'>Enter additional text to be appended to the bottom of each config file.</p>
						<p className='text-red-500 mb-2'>Disclaimer - these values are not validated, be sure to input them correctly!</p>
						<textarea
							{...form.getInputProps('dumbTextArea')}
							rows={10}
							placeholder={PLACEHOLDER_TEXT}
							className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
						/>
					</div>
				</InputSection>
			</Fragment>
		</div>
	);
};
