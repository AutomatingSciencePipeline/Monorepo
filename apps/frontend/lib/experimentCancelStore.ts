// MongoDB and backend bindings for experiment cancellation (the CancelDeps of
// ./experimentCancelCore.mjs). Kept apart from ./experimentCancel so the file that writes to the
// experiments collection never imports the audit log: the audit test suite fails if any file that
// references the audit log performs update or delete operations.
import { ObjectId } from 'mongodb';
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from './mongodb';
import { CANCELLED_STATUS } from './experimentCancelCore.mjs';
import type { CancelDeps, JobDeletionResult, StoredExperiment } from './experimentCancelCore.mjs';

const BACKEND_TIMEOUT_MS = 10000;

async function experiments() {
	return (await clientPromise).db(DB_NAME).collection(COLLECTION_EXPERIMENTS);
}

async function requestJobDeletion(expId: string): Promise<JobDeletionResult> {
	const backendPort = process.env.BACKEND_PORT || '5050';
	const response = await fetch(`http://glados-service-backend:${backendPort}/cancelExperiment`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jobName: 'runner-' + expId }),
		signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
	});
	if (response.ok) return 'deleted';
	if (response.status === 404) return 'not_found';
	throw new Error(`Backend refused Job deletion with HTTP ${response.status}`);
}

export const cancelStore: CancelDeps = {
	findExperiment: async (expId) => {
		const experiment = await (await experiments()).findOne(
			{ _id: new ObjectId(expId) },
			{ projection: { creator: 1, sharedUsers: 1, status: 1 } },
		);
		return experiment as StoredExperiment | null;
	},
	requestJobDeletion,
	markCancelled: async (expId, fromStatuses) => {
		// One update for both fields, conditional on the status, so a runner that finished in the
		// meantime is not overwritten and the two fields never disagree.
		const result = await (await experiments()).updateOne(
			{ _id: new ObjectId(expId), status: { $in: fromStatuses } },
			{ $set: { status: CANCELLED_STATUS, finished: true } },
		);
		return result.matchedCount === 1;
	},
};
