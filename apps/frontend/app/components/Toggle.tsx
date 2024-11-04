import { useState } from 'react';
import { Switch } from '@headlessui/react';

import classNames from 'classnames';

export interface ToggleProps {
	label: string;
	onChange: (newValue: boolean) => void;
	initialValue?: boolean;
}

export const Toggle = ({ label, onChange, initialValue }: ToggleProps) => {
	const [enabled, setEnabled] = useState(initialValue);

	return (
		<Switch.Group as='div' className='flex items-center'>
			<Switch
				checked={enabled}
				onChange={() => {
					const newValue = !enabled;
					setEnabled(newValue);
					onChange(newValue);
				}}
				className={classNames(
					enabled ? 'bg-blue-600' : 'bg-gray-200',
					'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
				)}
			>
				<span
					aria-hidden='true'
					className={classNames(
						enabled ? 'translate-x-5' : 'translate-x-0',
						'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
					)}
				/>
			</Switch>
			<Switch.Label as='span' className='ml-3'>
				<span className='text-sm font-medium text-gray-900'>{label}</span>
			</Switch.Label>
		</Switch.Group>
	);
};


