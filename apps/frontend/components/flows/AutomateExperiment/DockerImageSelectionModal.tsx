import React, { useState } from 'react';

const DockerImageSelectionModal = ({ isOpen, onClose }) => {
	const [selectedImage, setSelectedImage] = useState('');

	const handleImageSelect = (event) => {
		setSelectedImage(event.target.value);
	};

	const handleModalSubmit = async () => {
		// Send the selected image to the backend for container creation
		const response = await fetch('/create-container', {
			method: 'POST',
			headers: new Headers({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ image: selectedImage }),
		});

		// Handle backend response accordingly
		// ...

		onClose(); // Close the modal after handling
	};

	return (
		<div className={`your-modal-wrapper ${isOpen ? 'visible' : 'hidden'}`}>
			<div className="your-modal-content">
				<h2>Select Docker Image</h2>
				<select value={selectedImage} onChange={handleImageSelect}>
					{/* Populate the options with fetched image data */}
					<option value="">Select an image</option>
					{/* options will be populated later */}
				</select>
				<div className="mt-4 flex justify-end">
					<button type="button" className="btn" onClick={onClose}>Cancel</button>
					<button type="button" className="btn btn-primary" onClick={handleModalSubmit}>Create Container</button>
				</div>
			</div>
		</div>
	);
};

export default DockerImageSelectionModal;
