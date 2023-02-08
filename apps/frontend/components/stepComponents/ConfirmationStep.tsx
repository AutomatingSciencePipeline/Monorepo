import { Code } from '@mantine/core';

export const ConfirmationStep = ({ form, ...props }) => {
	return (
		<div className='h-full overflow-y-scroll flex-0 grow-0 my-4 pl-4 rounded-md flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Code
				// className='overflow-y-scroll max-h-full' block
				className='h-full'
				block
			>
				{' '}
				{JSON.stringify(form.values, null, 2)}
			</Code>
		</div>
	);
};
