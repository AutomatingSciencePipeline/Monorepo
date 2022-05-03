import supabase from './client';

export const submitExperiment = async (values, user) => {
	console.log('Making submission');
	const { data, error } = await supabase.from('experiments').insert([
		{
			creator: user.id,
			name: values.name,
			description: values.description,
			verbose: values.verbose,
			n_workers: values.nWorkers,
			parameters: JSON.stringify({
				params: values.parameters,
			}),
		},
	]);
	if (error) {
		throw error;
	} else {
		return { data };
	}
};

export const uploadExec = async (id, file) => {
	try {
		const filePath = `EXP_${id}/${file.name}`;

		const { error, ...rest } = await supabase.storage
			.from('executables')
			.upload(filePath, file);

		if (error) {
			throw error;
		} else {
			return rest;
		}
	} catch (error) {
		alert(error.message);
	} finally {
		// setUploading(false);
	}
};
