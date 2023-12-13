import React, { useState } from 'react';

const GithubExperimentModal = ({ isOpen, onClose }) => {
	const [githubUrl, setGithubUrl] = useState('');

	const handleNextClick = () => {
		// Add your logic for handling the "Next" button click, e.g., validation or further processing
		console.log('Next button clicked with GitHub URL:', githubUrl);
		// Close the modal after handling
		onClose();
	};

	const handleCancelClick = () => {
		// Add your logic for handling the "Cancel" button click
		console.log('Cancel button clicked');
		// Close the modal
		onClose();
	};

	return (
		<div className={`your-modal-wrapper ${isOpen ? 'visible' : 'hidden'}`}>
			<div className="your-modal-content">
				<label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700">
          GitHub Repository URL:
				</label>
				<input
					type="text"
					id="githubUrl"
					name="githubUrl"
					value={githubUrl}
					onChange={(e) => setGithubUrl(e.target.value)}
					className="mt-1 p-2 border border-gray-300 rounded-md w-full"
					placeholder="Enter GitHub Repository URL"
				/>

				<div className="mt-4 flex justify-end">
					<button
						type="button"
						className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
						onClick={handleCancelClick}
					>
            Cancel
					</button>
					<button
						type="button"
						className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
						onClick={handleNextClick}
					>
            Next
					</button>
				</div>
			</div>
		</div>
	);
};

export default GithubExperimentModal;
