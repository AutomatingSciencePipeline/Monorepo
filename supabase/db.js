import supabase from './client';

export const submitExperiment = async (values, user) => {
	try {
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
			return data;
			// console.log('experiment submitted with data ', data);
		}
	} catch (error) {
		console.log('error', error);
	}
};
