/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useState } from 'react';
import { getEnvVar } from '../../../utils/env';
import DockerImageSelectionModal from './DockerImageSelectionBox';

// TODO: Setup environment variables
// const FRONTEND_PORT = getEnvVar('FRONTEND_WEBSERVER_PORT');
// const CONTACT_FRONTEND_AT = getEnvVar('CONTACT_FRONTEND_AT');


const GithubExperimentModal = ({ isOpen, onClose }) => {
	const [githubUrl, setGithubUrl] = useState('');
	const [isDockerImageModalOpen, setIsDockerImageModalOpen] = useState(false);

	const handleNextClickPass = () => {
		setIsDockerImageModalOpen(true);
	};

	// TODO: Implement handleNextClick
	const handleNextClick = async () => {
		try {
			// Add your logic for handling the "Next" button click
			console.log('Next button clicked with GitHub URL:', githubUrl);

			// Send a request to the backend API to check if the GitHub repository is public
			// const url = `http://${CONTACT_FRONTEND_AT}:${FRONTEND_PORT}/check-github-repo`;
			const response = await fetch('/check-github-repo', {
				method: 'POST',
				headers: new Headers({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ githubUrl: 'githubUrl' }),
			});

			const result = await response.json();
			console.log(`response: ${response.status}`);
			console.log(`response: ${response.url}`);
			console.log(`response: ${result}`);

		    if (response.ok) {
				const result = await response.json();
				console.log(`response: ${response}`);
				console.log(`response: ${result}`);
				const isCloneable = result.isCloneable;

				if (isCloneable) {
			  	// Repository is cloneable, perform actions accordingly
			  	console.log('GitHub repository is cloneable!');
					setIsDockerImageModalOpen(true);
				} else {
			  	// Repository is not cloneable
			  	console.log('GitHub repository is not cloneable. It may be private.');
				}
			} else {
				console.error('Failed to check GitHub repository:', response.statusText);

				// Display a pop-up window or modal indicating that the GitHub repository cannot be cloned
				alert('Failed to check GitHub repository. It cannot be cloned.');
		  }
		} catch (error) {
		  console.error('Error checking GitHub repository:', error.message);

		  // Display a pop-up window or modal indicating that an error occurred
		  alert('An error occurred while checking the GitHub repository.');
		}

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
		<div className={`githubexp-modal-wrapper ${isOpen ? 'visible' : 'hidden'}`}>
			<div className="githubexp-modal-content">
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

				<div className="mt-4 flex justify-center">
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
						onClick={handleNextClickPass}
					>
            Next
					</button>
				</div>
			</div>
        	{isDockerImageModalOpen && <DockerImageSelectionModal isOpen={isDockerImageModalOpen} onClose={() => setIsDockerImageModalOpen(false)} />}
    	</div>
	);
};

export default GithubExperimentModal;
