export const InputSection = ({ header, ...props }) => {
	return (
		<div className='space-y-1 px-4 sm:grid sm:grid-cols-5 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5'>
			<div>
				<label className='block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2'>
					{' '}
					{header}{' '}
				</label>
			</div>
			{props.children}
		</div>
	);
};
