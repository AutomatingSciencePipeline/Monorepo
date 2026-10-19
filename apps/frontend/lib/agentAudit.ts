// Remote audit log for agent actions (Agentic Implementation Plan §4.2, invariant S-8).
//
// Every state-mutating agent action must go through withAudit(): the audit record is
// durably written first, and if that write fails the action is refused (fail closed).
// Read-only actions don't need it.
import clientPromise, { DB_NAME } from './mongodb';
import * as core from './agentAuditCore.mjs';
import type { AuditActionResult, AuditDeps, AuditRecord, AuditRequest } from './agentAuditCore.mjs';

export { AGENT_AUDIT_COLLECTION, AuditUnavailableError } from './agentAuditCore.mjs';
export type { AuditActionResult, AuditHealth, AuditRecord, AuditRequest } from './agentAuditCore.mjs';

const mongoDeps: AuditDeps = {
	getDb: async () => (await clientPromise).db(DB_NAME),
};

export function ensureAuditCollection() {
	return mongoDeps.getDb().then(core.ensureAuditCollection);
}

export function writeAuditRecord(request: AuditRequest & { action_result: AuditActionResult }) {
	return core.writeAuditRecord(request, mongoDeps);
}

export function withAudit<T>(request: AuditRequest, action: (record: AuditRecord) => Promise<T> | T) {
	return core.withAudit(request, action, mongoDeps);
}

export function checkAuditHealth() {
	return core.checkAuditHealth(mongoDeps);
}
