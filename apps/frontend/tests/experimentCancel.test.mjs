import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditUnavailableError, withAudit } from "../lib/agentAuditCore.mjs";
import { cancelExperiment, cancelExperimentAudited } from "../lib/experimentCancelCore.mjs";

const OWNER = "507f1f77bcf86cd799439011";
const SHARED = "507f1f77bcf86cd799439012";
const STRANGER = "507f1f77bcf86cd799439013";
const ADMIN = "507f1f77bcf86cd799439099";
const EID = "507f1f77bcf86cd799439014";

const owner = { userId: OWNER, isAdmin: false };

// In-memory stand-in for MongoDB and the backend. `events` records side effects in order.
function fakeDeps(opts = {}) {
  const events = [];
  let stored = opts.experiment === null ? null : {
    creator: OWNER, sharedUsers: [SHARED], status: "RUNNING", finished: false, ...opts.experiment,
  };
  const deps = {
    async findExperiment(expId) {
      events.push(`find:${expId}`);
      if (opts.findError) throw opts.findError;
      return stored && { ...stored };
    },
    async requestJobDeletion(expId) {
      events.push(`delete:runner-${expId}`);
      if (opts.backendError) throw opts.backendError;
      // Simulates a runner that finishes while the deletion request is in flight.
      if (opts.statusAfterDeletion) stored.status = opts.statusAfterDeletion;
      return opts.jobDeletion ?? "deleted";
    },
    async markCancelled(expId, fromStatuses) {
      events.push(`mark:${expId}`);
      if (opts.markError) throw opts.markError;
      if (!fromStatuses.includes(stored.status)) return false;
      stored = { ...stored, status: "CANCELLED", finished: true };
      return true;
    },
  };
  return { deps, events, stored: () => stored };
}

const sideEffects = (events) => events.filter((event) => !event.startsWith("find:"));

test("owner cancels a running experiment: Job deletion first, then one status update", async () => {
  const { deps, events, stored } = fakeDeps();
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: true, outcome: "cancel_requested", status: "CANCELLED" });
  assert.deepEqual(sideEffects(events), [`delete:runner-${EID}`, `mark:${EID}`]);
  assert.equal(stored().status, "CANCELLED");
  assert.equal(stored().finished, true);
});

test("admin can cancel another user's experiment", async () => {
  const { deps } = fakeDeps();
  const result = await cancelExperiment(EID, { userId: ADMIN, isAdmin: true }, deps);
  assert.equal(result.ok, true);
});

test("a shared user is refused with forbidden and causes no side effects", async () => {
  const { deps, events, stored } = fakeDeps();
  const result = await cancelExperiment(EID, { userId: SHARED, isAdmin: false }, deps);
  assert.deepEqual(result, { ok: false, error: "forbidden" });
  assert.deepEqual(sideEffects(events), []);
  assert.equal(stored().status, "RUNNING");
});

test("an unrelated user gets not_found, the same as for a missing experiment", async () => {
  const stranger = fakeDeps();
  assert.deepEqual(await cancelExperiment(EID, { userId: STRANGER, isAdmin: false }, stranger.deps),
    { ok: false, error: "not_found" });
  assert.deepEqual(sideEffects(stranger.events), []);

  const missing = fakeDeps({ experiment: null });
  assert.deepEqual(await cancelExperiment(EID, owner, missing.deps), { ok: false, error: "not_found" });
  assert.deepEqual(sideEffects(missing.events), []);
});

test("an ObjectId-typed creator still matches the owner's id string", async () => {
  const { deps } = fakeDeps({ experiment: { creator: { toString: () => OWNER } } });
  assert.equal((await cancelExperiment(EID, owner, deps)).ok, true);
});

for (const status of ["CREATED", "COMPLETED", "FAILED", "ARCHIVED", undefined]) {
  test(`status ${status ?? "missing"} is not cancellable and causes no side effects`, async () => {
    const { deps, events } = fakeDeps({ experiment: { status } });
    const result = await cancelExperiment(EID, owner, deps);
    assert.deepEqual(result, { ok: false, error: "not_cancellable", status: status ?? "UNKNOWN" });
    assert.deepEqual(sideEffects(events), []);
  });
}

test("cancelling an already cancelled experiment is a safe no-op", async () => {
  const { deps, events } = fakeDeps({ experiment: { status: "CANCELLED", finished: true } });
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: true, outcome: "already_cancelled", status: "CANCELLED" });
  assert.deepEqual(sideEffects(events), []);
});

test("backend failure never marks the experiment CANCELLED", async () => {
  const { deps, events, stored } = fakeDeps({ backendError: new Error("HTTP 500") });
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: false, error: "backend_error" });
  assert.deepEqual(sideEffects(events), [`delete:runner-${EID}`]);
  assert.equal(stored().status, "RUNNING");
  assert.equal(stored().finished, false);
});

test("a Job that is already gone still lets a RUNNING experiment be marked cancelled", async () => {
  const { deps, stored } = fakeDeps({ jobDeletion: "not_found" });
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: true, outcome: "cancel_requested", status: "CANCELLED" });
  assert.equal(stored().status, "CANCELLED");
});

test("a database failure after Job deletion is reported as a partial failure", async () => {
  const { deps } = fakeDeps({ markError: new Error("write failed") });
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: false, error: "status_update_failed", jobDeletionRequested: true });
});

test("retrying after a partial failure reconciles the status", async () => {
  const first = fakeDeps({ markError: new Error("write failed") });
  assert.equal((await cancelExperiment(EID, owner, first.deps)).error, "status_update_failed");
  // On retry the Job is already gone; the backend reports not_found and the update succeeds.
  const retry = fakeDeps({ jobDeletion: "not_found" });
  assert.deepEqual(await cancelExperiment(EID, owner, retry.deps),
    { ok: true, outcome: "cancel_requested", status: "CANCELLED" });
});

test("a runner that finishes during cancellation keeps its final status", async () => {
  const { deps, stored } = fakeDeps({ statusAfterDeletion: "COMPLETED" });
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: false, error: "not_cancellable", status: "COMPLETED" });
  assert.equal(stored().status, "COMPLETED");
});

test("a concurrent cancel that wins the race reports already_cancelled", async () => {
  const { deps } = fakeDeps({ statusAfterDeletion: "CANCELLED" });
  const result = await cancelExperiment(EID, owner, deps);
  assert.deepEqual(result, { ok: true, outcome: "already_cancelled", status: "CANCELLED" });
});

test("a lookup failure propagates and causes no side effects", async () => {
  const { deps, events } = fakeDeps({ findError: new Error("db down") });
  await assert.rejects(cancelExperiment(EID, owner, deps), /db down/);
  assert.deepEqual(sideEffects(events), []);
});

// Audited path: uses the real withAudit from agentAuditCore against a fake audit collection.
function fakeAudit(opts = {}) {
  const records = [];
  let inserts = 0;
  const auditDeps = {
    getDb: async () => ({
      async createCollection() {},
      listCollections: () => ({ toArray: async () => [{ options: { capped: true } }] }),
      collection: () => ({
        async insertOne(doc) {
          inserts++;
          if (opts.failInsertNumber === inserts) throw new Error("audit write failed");
          records.push(doc);
          return { acknowledged: true };
        },
      }),
    }),
  };
  const audit = (request, action) => withAudit(request, action, auditDeps);
  return { audit, records };
}

const AUDIT_REQUEST = { user_id: OWNER, action_type: "cancel_experiment", agent_id: "cli" };

test("audited cancel writes pending then success around the side effects", async () => {
  const { deps } = fakeDeps();
  const { audit, records } = fakeAudit();
  const result = await cancelExperimentAudited(EID, owner, deps, AUDIT_REQUEST, audit);
  assert.equal(result.ok, true);
  assert.deepEqual(records.map((record) => record.action_result), ["pending", "success"]);
  assert.equal(records[0].action_type, "cancel_experiment");
  assert.equal(records[1].parent_event_id, records[0].event_id);
});

test("audited cancel records a refusal as a failure outcome and returns the refusal", async () => {
  const { deps } = fakeDeps({ experiment: { status: "COMPLETED" } });
  const { audit, records } = fakeAudit();
  const result = await cancelExperimentAudited(EID, owner, deps, AUDIT_REQUEST, audit);
  assert.deepEqual(result, { ok: false, error: "not_cancellable", status: "COMPLETED" });
  assert.deepEqual(records.map((record) => record.action_result), ["pending", "failure"]);
});

test("audit unavailable: the cancellation never starts (fail closed)", async () => {
  const { deps, events, stored } = fakeDeps();
  const { audit } = fakeAudit({ failInsertNumber: 1 });
  await assert.rejects(cancelExperimentAudited(EID, owner, deps, AUDIT_REQUEST, audit), AuditUnavailableError);
  assert.deepEqual(events, []);
  assert.equal(stored().status, "RUNNING");
});
