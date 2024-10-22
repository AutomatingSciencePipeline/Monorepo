// THIS IS CURRENTLY UNUSED, FIGURE OUT HOW TO IMPORT IT INTO api/experiments/
import { MongoClient } from 'mongodb';
import { getEnvVar } from '../utils/env';

// Adapted from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb

const MONGODB_PORT = getEnvVar('MONGODB_PORT') || 'placeholder';
const USERNAME = getEnvVar('MONGODB_USERNAME') || 'placeholder';
const PASSWORD = getEnvVar('MONGODB_PASSWORD') || 'placeholder';

const MONGODB_URI = `mongodb://${USERNAME}:${PASSWORD}@glados-service-mongodb:${MONGODB_PORT}`;
const MONGODB_OPTIONS = {};

export const DB_NAME = 'gladosdb';
export const COLLECTION_LOGS = 'logs';
export const COLLECTION_ZIPS = 'zips';
export const COLLECTION_RESULTS_CSVS = 'results';
export const COLLECTION_EXPERIMENT_FILES = 'files';

//Also export the client for use with authjs, authjs recommends using this instead of a promise.
let client: MongoClient;
let clientPromise: Promise<MongoClient> = new Promise((success) => {
	return true;
}); // declare as empty promise

if (process.env.NODE_ENV === 'development') {
	// In development mode, use a global variable so that the value
	// is preserved across module reloads caused by HMR (Hot Module Replacement).
	const globalWithMongo = global as typeof globalThis & {
		_mongoClientPromise?: Promise<MongoClient>
	};

	if (!globalWithMongo._mongoClientPromise) {
		client = new MongoClient(MONGODB_URI, MONGODB_OPTIONS);
		globalWithMongo._mongoClientPromise = client.connect();
	}
	const temp = globalWithMongo._mongoClientPromise;
	if (temp) {
		clientPromise = temp;
	}
} else {
	// In production mode, it's best to not use a global variable.
	client = new MongoClient(MONGODB_URI, MONGODB_OPTIONS);
	clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

