import { Dropzone, DropzoneProps } from '@mantine/dropzone';
import { submitExperiment, uploadExec } from '../../../../firebase/db';
import { Group, Text } from '@mantine/core';

import { useAuth } from '../../../../firebase/fbAuth';
import { Upload, FileCode } from 'tabler-icons-react';
import { useState } from 'react';

const SUPPORTED_FILE_TYPES = {
	'text/plain': ['.py'],
	'text/x-python': ['.py'], // does nothing atm, from what I can tell
	'application/java-archive': ['.jar'],
	'text/c': ['.c'],
	'application/x-sharedlib': [], // does nothing atm, from what I can tell
	'application/x-elf': [], // does nothing atm, from what I can tell
};

export const DispatchStep = ({ id, form, ...props }) => {
	const { userId } = useAuth();
	const [loading, setLoading] = useState<boolean>(false);

	const onDropFile = (files: Parameters<DropzoneProps['onDrop']>[0]) => {
		setLoading(true);
		console.log('Submitting Experiment');
		submitExperiment(form.values, userId as string).then(async (expId) => {
			console.log(`Uploading file for ${expId}:`, files);
			console.log(JSON.stringify({
				"fileToUpload": arrayBufferToBase64(files[0].arrayBuffer),
				"experimentId": expId
			}));
			const uploadResponse = await fetch('/api/files/uploadFile', {
				method: 'POST',
				headers: new Headers({ 'Content-Type': 'application/json' }),
				credentials: 'same-origin',
				body: JSON.stringify({
					"fileToUpload": arrayBufferToBase64(files[0].arrayBuffer),
					"experimentId": expId
				})
			})
			if (uploadResponse) {
				console.log(`Handing experiment ${expId} to the backend`);
				const response = await fetch(`/api/experiments/${expId}`, {
					method: 'POST',
					headers: new Headers({ 'Content-Type': 'application/json' }),
					credentials: 'same-origin',
					body: JSON.stringify({ id: expId }),
				});
				if (response.ok) {
					console.log('Response from backend received', response);
				} else {
					const responseText = await response.text();
					console.log('Upload failed', responseText, response);
					throw new Error(`Upload failed: ${response.status}: ${responseText}`);
				}
			} else {
				throw new Error('Failed to upload experiment file to the backend server, is it running?');
			}
		}).catch((error) => {
			console.log('Error uploading experiment: ', error);
			alert(`Error uploading experiment: ${error.message}`);
		}).finally(() => {
			setLoading(false);
		});
	};

	const MAXIMUM_SIZE_BYTES = 3 * 1024 ** 2;

	return (
		<Dropzone
			onDrop={onDropFile}
			onReject={(rejections) => {
				console.log('File rejection details', rejections);
				const uploadedType = rejections[0]?.file?.type;
				alert(`Rejected:\n${rejections[0]?.errors[0]?.message}\nYour file was of type: ${uploadedType ? uploadedType : 'Unknown'}\nCheck the console for more details.`);
			}}
			maxSize={MAXIMUM_SIZE_BYTES}
			maxFiles={1}
			className='flex-1 flex flex-col justify-center m-4 items-center'
			loading={loading}
			// accept={SUPPORTED_FILE_TYPES}
		>
			<Group position="center" spacing="xl" style={{ minHeight: 220, pointerEvents: 'none' }}>
				<Dropzone.Accept>
					<Upload size={80} strokeWidth={1}/>
				</Dropzone.Accept>
				<Dropzone.Reject>
					{/* For some reason (seems to be happening on React itself's side?) the dropzone is claiming to reject files even if the file's mime
					type is included in the accept list we pass it. Works for images, when changed to be images, but not our stuff. Check browser console
					and you can see that the file object's type really does match what we have in our list!*/}
					<Upload size={80} strokeWidth={1}/>
					{/* <X size={80} strokeWidth={1}/> */}
				</Dropzone.Reject>
				<Dropzone.Idle>
					<FileCode size={80} strokeWidth={1}/>
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
	);
};

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary).toString("base64");
}

