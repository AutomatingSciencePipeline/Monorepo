'use client'

import { Dropzone, DropzoneProps } from '@mantine/dropzone';
import { Group, Text } from '@mantine/core';

import { useSession } from "next-auth/react";
import { Upload, FileCode } from 'tabler-icons-react';
import { useEffect, useState } from 'react';
import { getRecentFiles } from '../../../../../lib/mongodb_funcs';
import { on } from 'events';

const SUPPORTED_FILE_TYPES = {
	'text/plain': ['.py'],
	'text/x-python': ['.py'], // does nothing atm, from what I can tell
	'application/java-archive': ['.jar'],
	'text/c': ['.c'],
	'application/x-sharedlib': [], // does nothing atm, from what I can tell
	'application/x-elf': [], // does nothing atm, from what I can tell
};

export const DispatchStep = ({ id, form, updateId, ...props }) => {
	const { data: session } = useSession();
	const [loading, setLoading] = useState<boolean>(false);

	const [userFiles, setUserFiles] = useState<any[]>([]);

	const [selectedFile, setSelectedFile] = useState<string>("");

	useEffect(() => {
		getRecentFiles(session?.user?.id!).then((files) => {
			setUserFiles(files);
		}).catch((error) => console.error("Error fetching files:", error));
	}, [session?.user?.id]);


	const onDropFile = async (files: Parameters<DropzoneProps['onDrop']>[0]) => {
		setLoading(true);
		const formData = new FormData();
		formData.set("file", files[0]);
		formData.set("userId", session?.user?.id!);
		const uploadFileResponse = await fetch('/api/files/uploadFile', {
			method: 'POST',
			credentials: 'same-origin',
			body: formData
		});
		if (uploadFileResponse.ok) {
			const json = await uploadFileResponse.json();
			const fileId = json['fileId'];
			const fileName = json['fileName'];
			updateId(fileId);
			setSelectedFile(fileName);
			setLoading(false);
		}
		else {
			const json = await uploadFileResponse.json();
			console.log(`Failed to upload file: ${json['message']}`);
		}
		// submitExperiment(form.values, session?.user?.id as string).then(async (json) => {
		// 	const expId = json['id'];
		// 	updateId(expId);
		// 	const formData = new FormData();
		// 	formData.set("file", files[0]);
		// 	formData.set("expId", expId);
		// 	const uploadResponse = await fetch('/api/files/uploadFile', {
		// 		method: 'POST',
		// 		credentials: 'same-origin',
		// 		body: formData
		// 	});
		// 	if (uploadResponse.ok) {
		// 		console.log(`Handing experiment ${expId} to the backend`);
		// 		const response = await fetch(`/api/experiments/start/${expId}`, {
		// 			method: 'POST',
		// 			headers: new Headers({ 'Content-Type': 'application/json' }),
		// 			credentials: 'same-origin',
		// 			body: JSON.stringify({ id: expId }),
		// 		});
		// 		if (response.ok) {
		// 			console.log('Response from backend received', response);
		// 		} else {
		// 			const responseText = await response.text();
		// 			console.log('Upload failed', responseText, response);
		// 			throw new Error(`Upload failed: ${response.status}: ${responseText}`);
		// 		}
		// 	} else {
		// 		throw new Error('Failed to upload experiment file to the backend server, is it running?');
		// 	}
		// }).catch((error) => {
		// 	console.log('Error uploading experiment: ', error);
		// 	alert(`Error uploading experiment: ${error.message}`);
		// }).finally(() => {
		// 	setLoading(false);
		// });
	};

	const MAXIMUM_SIZE_BYTES = 3 * 1024 ** 2;

	return (
		<div className='flex flex-col h-full'>
			<div className='flex-2'>
				<Dropzone
					onDrop={onDropFile}
					onReject={(rejections) => {
						console.log('File rejection details', rejections);
						const uploadedType = rejections[0]?.file?.type;
						alert(`Rejected:\n${rejections[0]?.errors[0]?.message}\nYour file was of type: ${uploadedType ? uploadedType : 'Unknown'}\nCheck the console for more details.`);
					}}
					maxSize={MAXIMUM_SIZE_BYTES}
					maxFiles={1}
					className='justify-center m-4 items-center h-full'
					loading={loading}
				// accept={SUPPORTED_FILE_TYPES}
				>
					<Group position="center" spacing="xl" style={{ minHeight: 220, pointerEvents: 'none' }}>
						<Dropzone.Accept>
							<Upload size={80} strokeWidth={1} />
						</Dropzone.Accept>
						<Dropzone.Reject>
							{/* For some reason (seems to be happening on React itself's side?) the dropzone is claiming to reject files even if the file's mime
					type is included in the accept list we pass it. Works for images, when changed to be images, but not our stuff. Check browser console
					and you can see that the file object's type really does match what we have in our list!*/}
							<Upload size={80} strokeWidth={1} />
							{/* <X size={80} strokeWidth={1}/> */}
						</Dropzone.Reject>
						<Dropzone.Idle>
							<FileCode size={80} strokeWidth={1} />
						</Dropzone.Idle>

						<div>
							<Text size="xl" inline>
								Upload your project executable.
							</Text>
							<Text size="sm" color="dimmed" inline mt={7}>
								Drag-and-drop, or click here to open a file picker.
							</Text>
							<Text size="sm" color="dimmed" inline mt={7}>
								{/* Supported: {[...new Set(Object.values(SUPPORTED_FILE_TYPES).flat())].join(', ')} */}
								Supporting .py, .jar and binary executables
							</Text>
						</div>
					</Group>
				</Dropzone>
			</div>
			<div className='p-5 flex-1'>
				<h1 className='py-5'>Recent Files</h1>
				<table className="table-auto w-full border-collapse border border-gray-300">
					<thead>
						<tr className="bg-gray-200">
							<th className="border border-gray-300 px-4 py-2">Select</th>
							<th className="border border-gray-300 px-4 py-2">Filename</th>
							<th className="border border-gray-300 px-4 py-2">Upload Date</th>
						</tr>
					</thead>
					<tbody>
						{userFiles.map((file) => (
							<tr key={file._id.toString()} className="text-center">
								<td className="border border-gray-300 px-4 py-2">
									<button
										className='rounded-md w-1/2 border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-50 focus:ring-offset-2'
										onClick={() => {
											updateId(file._id.toString());
											setSelectedFile(file.filename);
										}}
									>
										Use
									</button>
								</td>
								<td className="border border-gray-300 px-4 py-2">{file.filename}</td>
								<td className="border border-gray-300 px-4 py-2">
									{new Date(file.uploadDate).toLocaleString()}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className='mt-auto p-5 text-center text-lg'>
				{
					selectedFile ? 'Current selected file: ' + selectedFile : <></>
				} 
			</div>
		</div>

	);
};
