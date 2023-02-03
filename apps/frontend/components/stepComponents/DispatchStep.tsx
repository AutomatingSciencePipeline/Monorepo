import { Dropzone } from '@mantine/dropzone';
import { submitExperiment, uploadExec } from '../../firebase/db';
import { Text } from '@mantine/core';

import { useAuth } from '../../firebase/fbAuth';
import { Upload, X, File, IconProps } from 'tabler-icons-react';

export const DispatchStep = ({ id, form, ...props }) => {
	const { userId, authService } = useAuth();

	const onDropFile = async (file) => {
		console.log('Submitting Experiment!!!');
		submitExperiment(form.values, userId).then(async (expId) => {
			console.log(`Uploading file for ${expId}`);
			const uploadResponse = await uploadExec(expId, file[0]);
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
					alert(`Upload failed: ${response.status}: ${responseText}`);
					console.log('Upload failed', responseText, response);
					throw new Error(`Upload failed: ${response.status}: ${responseText}`);
				}
			} else {
				alert('Failed to upload experiment file to the backend server, is it running?');
				throw new Error('Upload failed');
			}
		}).catch((error) => {
			console.log('Error uploading experiment: ', error);
			alert(`Error uploading experiment: ${error.message}`);
		});
	};

	return (
		<Dropzone
			onDrop={onDropFile}
			onReject={(file) => console.log('NOPE, file rejected', file)}
			maxSize={3 * 1024 ** 2}
			className='flex-1 flex flex-col justify-center m-4 items-center'
			accept={{
				'text/plain': ['.py'],
				'application/java-archive': ['.jar'],
			}}
		>
			<>{(status) => dropzoneKids(status)}</>
		</Dropzone>
	);
};

const dropzoneKids = (status) => {
	return (status.accepted) ?
		<UploadIcon className={'bg-green-500'} status={status} /> :
		<div className={'flex flex-col justify-center items-center space-y-6'}>
			<UploadIcon status={status} />
			<div>
				<Text size='xl' inline>
                    Upload your project executable.
				</Text>
				<Text size='sm' color='dimmed' inline mt={7}>
                    Let%apos;s revolutionize science!
				</Text>
			</div>
		</div>;
};
interface UploadIconProps extends IconProps {
    status
}

const UploadIcon: React.FC<UploadIconProps> = ({ status }) => {
	if (status.accepted) {
		return <Upload size={80} />;
	} else if (status.rejected) {
		return <X size={80} />;
	}
	return <File size={80} />;
};
