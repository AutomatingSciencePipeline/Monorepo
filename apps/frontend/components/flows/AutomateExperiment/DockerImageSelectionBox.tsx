import React, { useEffect, useState } from 'react';

function DockerImageSelectionBox() {
	const [images, setImages] = useState([]);
	const [selectedImage, setSelectedImage] = useState('');
	const user = 'gladospipeline';
	const repository = 'glados-testing';

	useEffect(() => {
		// Fetch Docker images when the component mounts
		fetchDockerImages(user, repository);
	}, []);

	const fetchDockerImages = async (user, repository) => {
		try {
			// Corrected the URL to match the Flask route and added user and repository as query parameters
			const url = `/get-images?user=${encodeURIComponent(user)}&repository=${encodeURIComponent(repository)}`;
			const response = await fetch(url);
			const data = await response.json();
			// Assuming the backend returns a JSON array directly
			if (response.ok) {
				// Update your state or DOM based on 'data', which now contains image names
				setImages(data); // Assuming 'data' is the array of image names
			} else {
				console.error('Error fetching Docker images:', data.error);
			}
		} catch (error) {
			console.error('Unexpected error fetching Docker images:', error);
		}
	};


	const handleImageChange = (event) => {
		setSelectedImage(event.target.value);
	};


	return (
		<div className="docker-images-modal-wrapper">
			<div className="docker-images-content">
				<h2 className="pb-2">Select Docker Image</h2>
				<select value={selectedImage} onChange={handleImageChange}>
					<option value="">Select an Image</option>
					{images.map((image, index) => (
						<option key={index} value={image}>
							{image}
						</option>
					))}
				</select>
				<div className="mt-4 flex justify-center">
					<button
						type="button"
						className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
					>
            Cancel
					</button>
					<button
						type="button"
						className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
					>
            Create
					</button>
				</div>
			</div>
		</div>

	);
}

export default DockerImageSelectionBox;


function then(arg0: (response: any) => any) {
	throw new Error('Function not implemented.');
}
// const DockerImageSelection = () => {
// 	const [selectedImage, setSelectedImage] = useState("");

// 	const handleImageSelect = (event) => {
// 		setSelectedImage(event.target.value);
// 	};

// 	const handleModalSubmit = async () => {
// 		// Send the selected image to the backend for container creation
// 		const response = await fetch("/create-container", {
// 			method: "POST",
// 			headers: new Headers({ "Content-Type": "application/json" }),
// 			body: JSON.stringify({ image: selectedImage }),
// 		});

// 		// Handle backend response accordingly
// 		// ...

// 		// onclose(); // Close the modal after handling
// 	};

// 	return (
// 		<div className="docker-images-modal-wrapper">
// 			<div className="docker-images-content">
// 				<h2>Select Docker Image</h2>
// 				<select value={selectedImage} onChange={handleImageSelect}>
// 					{/* Populate the options with fetched image data */}
// 					<option value="">Select an image</option>
// 					<option value="">docker/welcome-to-docker</option>
// 					<option value="">evo-devo-nkfl-core</option>
// 					{/* options will be populated later */}
// 				</select>
// 				<div className="mt-4 flex justify-center">
// 					<button
// 						type="button"
// 						className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
// 					>
//             Cancel
// 					</button>
// 					<button
// 						type="button"
// 						className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
// 					>
//             Create
// 					</button>
// 				</div>
// 			</div>
// 		</div>
// 	);
// };

// export default DockerImageSelection;
