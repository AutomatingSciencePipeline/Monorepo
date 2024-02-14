import React, { useEffect, useState } from 'react';
import { AutoComplete } from 'primereact/autocomplete';
import 'primereact/resources/themes/lara-light-indigo/theme.css';

export function AutoCompleteChip() {
	const [selectedTags, setselectedTags] = useState<{ name: string }[]>([]);
	const [filteredTags, setfilteredTags] = useState<{ name: string }[]>([]);

	// Mock data for countries
	const tagList = [
		{ name: 'java' },
		{ name: 'python' },
		{ name: 'c' },
		// Add more tags if needed
	];

	const search = (event) => {
		// Timeout to emulate a network connection
		setTimeout(() => {
			let _filteredTags;

			if (!event.query.trim().length) {
				_filteredTags = [...tagList];
			} else {
				_filteredTags = tagList.filter((tag) => {
					return tag.name.toLowerCase().startsWith(event.query.toLowerCase());
				});
			}

			setfilteredTags(_filteredTags);
		}, 250);
	};

	useEffect(() => {
		setfilteredTags(tagList);
	}, []);

	return (
		<div className="card p-fluid">
			<AutoComplete
				field="name"
				multiple
				value={selectedTags}
				suggestions={filteredTags}
				completeMethod={search}
				onChange={(e) => setselectedTags(e.value)}
				className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
			/>
		</div>
	);
}
