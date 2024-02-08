import React, { useEffect, useState } from 'react';
import { AutoComplete } from 'primereact/autocomplete';

export function AutoCompleteChip() {
	const [selectedCountries, setSelectedCountries] = useState<{ name: string }[]>([]);
	const [filteredCountries, setFilteredCountries] = useState<{ name: string }[]>([]);

	// Mock data for countries
	const mockCountries = [
		{ name: 'Afghanistan' },
		{ name: 'Albania' },
		{ name: 'Algeria' },
		// Add more countries as needed
	];

	const search = (event) => {
		// Timeout to emulate a network connection
		setTimeout(() => {
			let _filteredCountries;

			if (!event.query.trim().length) {
				_filteredCountries = [...mockCountries]; // Use mock data instead of countries
			} else {
				_filteredCountries = mockCountries.filter((country) => {
					return country.name.toLowerCase().startsWith(event.query.toLowerCase());
				});
			}

			setFilteredCountries(_filteredCountries);
		}, 250);
	};

	useEffect(() => {
		// Set initial filtered countries to all countries
		setFilteredCountries(mockCountries);
	}, []);

	return (
		<div className="card p-fluid">
			<AutoComplete
				field="name"
				multiple
				value={selectedCountries}
				suggestions={filteredCountries}
				completeMethod={search}
				onChange={(e) => setSelectedCountries(e.value)}
			/>
		</div>
	);
}
