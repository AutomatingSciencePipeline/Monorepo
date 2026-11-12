// Experiment cancellation entry points for the web UI and the CLI route.
// The logic lives in ./experimentCancelCore.mjs (see that file for the order of operations) and
// the database and backend calls in ./experimentCancelStore.ts.
//
// This module is deliberately NOT a 'use server' module: its functions trust the actor they are
// given. Callers must build the actor from a verified identity (the session in a server action,
// or authenticateCli in a CLI route), never from request data.
import { withAudit } from './agentAudit';
import { cancelExperiment, cancelExperimentAudited } from './experimentCancelCore.mjs';
import type { CancelActor, CancelResult } from './experimentCancelCore.mjs';
import { cancelStore } from './experimentCancelStore';

export { AuditUnavailableError } from './agentAudit';
export type { CancelResult } from './experimentCancelCore.mjs';

export const CANCEL_AUDIT_ACTION = 'cancel_experiment';
export const CLI_AUDIT_AGENT_ID = 'cli';

/** Web UI cancellation. Not audited: only agent-reachable (CLI) paths write agent_audit. */
export function cancelExperimentAsUser(expId: string, actor: CancelActor): Promise<CancelResult> {
	return cancelExperiment(expId, actor, cancelStore);
}

/**
 * CLI cancellation. CLI tokens can be used by an agent, so the attempt is written to agent_audit
 * first; if that write fails this throws AuditUnavailableError and nothing is cancelled.
 */
export function cancelExperimentFromCli(expId: string, userId: string): Promise<CancelResult> {
	// The CLI path cancels only the user's own experiments; admins cancel from the web UI.
	const actor: CancelActor = { userId, isAdmin: false };
	return cancelExperimentAudited(
		expId,
		actor,
		cancelStore,
		{ user_id: userId, action_type: CANCEL_AUDIT_ACTION, agent_id: CLI_AUDIT_AGENT_ID },
		withAudit,
	);
}
