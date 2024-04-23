import { Checkbox } from 'primereact/checkbox';
import { useEffect, useState } from 'react';

export const InputSectionWithCheckBox = ({ header, isChecked, onCheckboxChange, children }) => {
	const [checked, setChecked] = useState(isChecked);

	// Synchronize internal state with external props
	useEffect(() => {
		setChecked(isChecked);
	}, [isChecked]);

	const handleChange = (e) => {
		setChecked(e.checked); // Update internal state
		onCheckboxChange(e.checked); // Propagate changes to parent component
	};

	return (
		<div className='space-y-1 px-4 sm:grid sm:grid-cols-5 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5'>
			<div className='sm:col-span-1'>
				<label className='block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2'>
					{header}
				</label>
				<div>
					<Checkbox onChange={handleChange} checked={checked}></Checkbox>
				</div>
			</div>
			<div className='sm:col-span-4'>
				{children}
			</div>
		</div>
	);
};
