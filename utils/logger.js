import pino from 'pino';

const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	prettyPrint: {
		colorize: true,
		translateTime: 'SYS:standard',
	},
});


export default logger;