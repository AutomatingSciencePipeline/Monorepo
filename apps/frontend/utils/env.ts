export const getEnvVar = (name: string): string => {
	const value = process.env[name];
	if (value === undefined) {
		throw new Error(`Environment variable ${name} is not defined, make sure you have set up your environment file and/or run the dev install script`);
	}
	return value;
};
