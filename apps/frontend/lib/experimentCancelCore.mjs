// Core of experiment cancellation, shared by the web UI and POST /api/cli/cancelExp.
// Dependencies are injected so this file has no connection side effects and can be tested under
// plain Node; application code should import the bound versions from ./experimentCancel instead.
//
// Order of operations, so a failure never leaves a false CANCELLED behind:
//   1. authorize against the stored experiment,
//   2. check that its status can be cancelled,
//   3. ask the backend to delete the Kubernetes Job,
//   4. only then mark the experiment CANCELLED, conditional on its status not having changed.
//
// Deleting a Job is asynchronous: an accepted request means Kubernetes will stop the runner, not
// that it has already stopped. Callers observe the final state through the experiment status.

// Only a running experiment is cancelled for now. A CREATED experiment may not have its Job yet,
// so cancelling it would race with Job creation; it is refused until that is handled.
export const CANCELLABLE_STATUSES = ["RUNNING"];
export const CANCELLED_STATUS = "CANCELLED";

/**
 * @typedef {"cancel_requested" | "already_cancelled"} CancelOutcome
 * @typedef {"not_found" | "forbidden" | "not_cancellable" | "backend_error" | "status_update_failed"} CancelError
 *
 * @typedef {{ ok: true, outcome: CancelOutcome, status: string }
 *   | { ok: false, error: CancelError, status?: string, jobDeletionRequested?: boolean }} CancelResult
 *
 * @typedef {object} CancelActor
 * @property {string} userId
 * @property {boolean} isAdmin  Must come from the server-side session or user record, never from the request.
 *
 * @typedef {object} StoredExperiment
 * @property {string} creator
 * @property {string[]} [sharedUsers]
 * @property {string} [status]
 *
 * @typedef {"deleted" | "not_found"} JobDeletionResult
 *   "not_found" means the Job no longer exists, e.g. it already finished or an earlier cancel
 *   deleted it. Any other backend failure must be thrown.
 *
 * @typedef {object} CancelDeps
 * @property {(expId: string) => Promise<StoredExperiment | null>} findExperiment
 * @property {(expId: string) => Promise<JobDeletionResult>} requestJobDeletion
 * @property {(expId: string, fromStatuses: string[]) => Promise<boolean>} markCancelled
 *   Sets status CANCELLED and finished true only if the status is still one of fromStatuses.
 *   Returns whether the experiment was updated.
 */

export class CancelRefusedError extends Error {
  /** @param {CancelResult} result */
  constructor(result) {
    super(`Cancellation refused: ${result.ok ? result.outcome : result.error}`);
    this.name = "CancelRefusedError";
    this.result = result;
  }
}

function sameId(left, right) {
  return left !== undefined && left !== null && String(left) === String(right);
}

function canAct(experiment, actor) {
  return sameId(experiment.creator, actor.userId) || actor.isAdmin === true;
}

function canSee(experiment, actor) {
  return canAct(experiment, actor)
    || (Array.isArray(experiment.sharedUsers) && experiment.sharedUsers.some((user) => sameId(user, actor.userId)));
}

/**
 * Cancels an experiment on behalf of `actor`. Never marks the experiment CANCELLED unless the
 * backend accepted the Job deletion (or the Job is already gone).
 * @param {string} expId
 * @param {CancelActor} actor
 * @param {CancelDeps} deps
 * @returns {Promise<CancelResult>}
 */
export async function cancelExperiment(expId, actor, deps) {
  const experiment = await deps.findExperiment(expId);
  // Unrelated users get the same answer as for a missing experiment, so existence is not leaked.
  if (!experiment || !canSee(experiment, actor)) {
    return { ok: false, error: "not_found" };
  }
  // Shared users can already see the experiment, so telling them they lack permission leaks nothing.
  if (!canAct(experiment, actor)) {
    return { ok: false, error: "forbidden" };
  }
  if (experiment.status === CANCELLED_STATUS) {
    return { ok: true, outcome: "already_cancelled", status: CANCELLED_STATUS };
  }
  if (!CANCELLABLE_STATUSES.includes(experiment.status)) {
    return { ok: false, error: "not_cancellable", status: experiment.status ?? "UNKNOWN" };
  }

  try {
    await deps.requestJobDeletion(expId);
  } catch {
    return { ok: false, error: "backend_error" };
  }

  let updated;
  try {
    updated = await deps.markCancelled(expId, CANCELLABLE_STATUSES);
  } catch {
    // The Job deletion was requested but the status was not saved. Retrying is safe: the backend
    // reports the missing Job as "not_found" and the status update is attempted again.
    return { ok: false, error: "status_update_failed", jobDeletionRequested: true };
  }
  if (updated) {
    return { ok: true, outcome: "cancel_requested", status: CANCELLED_STATUS };
  }

  // The status changed between the read and the update, e.g. the runner finished or another
  // cancel won. Report what it is now instead of claiming this request cancelled it.
  const current = await deps.findExperiment(expId);
  if (current?.status === CANCELLED_STATUS) {
    return { ok: true, outcome: "already_cancelled", status: CANCELLED_STATUS };
  }
  return { ok: false, error: "not_cancellable", status: current?.status ?? "UNKNOWN" };
}

/**
 * Runs cancelExperiment inside `audit` (withAudit from ./agentAudit). The audit record is written
 * before anything else, so if the audit log is unavailable the cancellation never starts and the
 * audit error propagates to the caller. A refused cancellation is recorded as a failure outcome.
 * @param {string} expId
 * @param {CancelActor} actor
 * @param {CancelDeps} deps
 * @param {{ user_id: string, action_type: string, agent_id: string }} auditRequest
 * @param {<T>(request: object, action: () => Promise<T>) => Promise<T>} audit
 * @returns {Promise<CancelResult>}
 */
export async function cancelExperimentAudited(expId, actor, deps, auditRequest, audit) {
  try {
    return await audit(auditRequest, async () => {
      const result = await cancelExperiment(expId, actor, deps);
      // Throwing makes withAudit append a "failure" outcome; the result is unwrapped below.
      if (!result.ok) throw new CancelRefusedError(result);
      return result;
    });
  } catch (error) {
    if (error instanceof CancelRefusedError) return error.result;
    throw error;
  }
}
