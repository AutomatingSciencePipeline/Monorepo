import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { ChangeEventHandler, useState } from 'react';

export interface SearchBarProps {
	labelText: string,
	placeholderText: string,
	initialValue?: string,
	onValueChanged: (newValue: string) => void
}

export const SearchBar = ({ labelText, placeholderText, initialValue, onValueChanged }: SearchBarProps) => {
	const [searchInput, setSearchInput] = useState<string>(initialValue || '');

	const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
		event.preventDefault();
		const newValue = event.target.value;
		setSearchInput(newValue);
		onValueChanged(newValue);
	};

	// Future improvement: add a debounce to the onChange event handler https://medium.com/nerd-for-tech/debounce-your-search-react-input-optimization-fd270a8042b

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
						type='search'
						className='block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-blue-400 bg-opacity-25 text-blue-100 placeholder-blue-200 focus:outline-none focus:bg-white focus:ring-0 focus:placeholder-gray-400 focus:text-gray-900 sm:text-sm'
						placeholder={placeholderText}
						onChange={handleChange}
						value={searchInput}
					/>
				</div>
			</div>
		</div>
	);
};
