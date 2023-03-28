import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

export const SearchBar = ({ labelText, placeholderText }) => {
	return (
		<div className='flex basis-1/2 justify-center lg:justify-end'>
			<div className='w-full px-2 justify-center place-content-center lg:px-6'>
				<label htmlFor='search' className='sr-only'>
					{labelText}
				</label>
				<div className='relative text-blue-200 focus-within:text-gray-400'>
					<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
						<MagnifyingGlassIcon className='h-5 w-5' aria-hidden='true' />
					</div>
					<input
						id='search'
						name='search'
						className='block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-blue-400 bg-opacity-25 text-blue-100 placeholder-blue-200 focus:outline-none focus:bg-white focus:ring-0 focus:placeholder-gray-400 focus:text-gray-900 sm:text-sm'
						placeholder={placeholderText}
						type='search'
					/>
				</div>
			</div>
		</div>
	);
};
