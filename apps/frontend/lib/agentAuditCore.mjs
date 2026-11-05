// Core of the remote agent audit log (Agentic Implementation Plan §4.2, invariant S-8).
// The database is injected so this file has no connection side effects and can be tested under
// plain Node; application code should import the bound versions from ./agentAudit instead.
//
// This module intentionally exposes no update/delete helpers for the audit collection.
// Corrections are made by appending new records, never by editing old ones.
import { randomUUID } from "node:crypto";

export const AGENT_AUDIT_COLLECTION = "agent_audit";
// Capped collections overwrite the oldest entries once full, so size this generously.
export const AGENT_AUDIT_MAX_BYTES = 256 * 1024 * 1024;
// Health probes write here instead of agent_audit so they never evict real audit records.
export const AGENT_AUDIT_HEARTBEAT_COLLECTION = "agent_audit_heartbeat";
const HEARTBEAT_MAX_BYTES = 4096;
const AUDIT_WRITE_TIMEOUT_MS = 5000;
const HEALTH_CHECK_TIMEOUT_MS = 8000;

// Majority-acknowledged and journaled, so "written" means it survives a primary failover.
// The timeout matters: with a primary but no majority of data-bearing members (e.g. one data
// node down in a primary-secondary-arbiter set), a majority write would otherwise block forever.
const DURABLE_WRITE = { writeConcern: { w: "majority", j: true, wtimeoutMS: AUDIT_WRITE_TIMEOUT_MS } };

export const AUDIT_ACTION_RESULTS = ["pending", "success", "failure"];

/**
 * @typedef {"pending" | "success" | "failure"} AuditActionResult
 *
 * @typedef {object} AuditRequest  What a caller supplies; event_id and timestamp are generated here.
 * @property {string} user_id
 * @property {string} action_type
 * @property {string} agent_id
 *
 * @typedef {object} AuditRecord
 * @property {string} event_id
 * @property {string} user_id
 * @property {Date} timestamp
 * @property {string} action_type
 * @property {AuditActionResult} action_result
 * @property {string} agent_id
 * @property {string} [parent_event_id]  Set on outcome records, pointing at the original 'pending' record.
 *
 * @typedef {object} AuditDeps
 * @property {() => Promise<import("mongodb").Db>} getDb
 *
 * @typedef {object} AuditHealth
 * @property {boolean} healthy
 * @property {string} [reason]
 */

export class AuditUnavailableError extends Error {
  /**
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(message, options) {
    super(message, options);
    this.name = "AuditUnavailableError";
  }
}

async function createCappedCollection(db, name, size) {
  try {
    await db.createCollection(name, { capped: true, size });
  } catch (error) {
    // Another instance may have created it first; that's fine as long as it's capped (checked below).
    if (error?.codeName !== "NamespaceExists" && error?.code !== 48) {
      throw error;
    }
  }
  const [info] = await db.listCollections({ name }).toArray();
  if (!info?.options?.capped) {
    throw new Error(`${name} exists but is not a capped collection`);
  }
}

// Caches one in-flight or successful creation per (Db, collection name); a failure is not cached.
const ensuredCollections = new WeakMap();

function ensureCappedCollection(db, name, size) {
  let byName = ensuredCollections.get(db);
  if (!byName) {
    byName = new Map();
    ensuredCollections.set(db, byName);
  }
  let pending = byName.get(name);
  if (!pending) {
    pending = createCappedCollection(db, name, size);
    byName.set(name, pending);
    const cache = byName;
    pending.catch(() => cache.delete(name));
  }
  return pending;
}

/**
 * Creates the capped agent_audit collection if it doesn't exist.
 * @param {import("mongodb").Db} db
 * @returns {Promise<import("mongodb").Collection<AuditRecord>>}
 */
export async function ensureAuditCollection(db) {
  await ensureCappedCollection(db, AGENT_AUDIT_COLLECTION, AGENT_AUDIT_MAX_BYTES);
  return db.collection(AGENT_AUDIT_COLLECTION);
}

function requireNonEmpty(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AuditUnavailableError(`Audit record field "${field}" must be a non-empty string`);
  }
  return value;
}

/**
 * Durably writes one audit record. Throws AuditUnavailableError if the record could not be written.
 * @param {AuditRequest & { action_result: AuditActionResult, parent_event_id?: string }} request
 * @param {AuditDeps} deps
 * @returns {Promise<AuditRecord>}
 */
export async function writeAuditRecord(request, deps) {
  if (!AUDIT_ACTION_RESULTS.includes(request.action_result)) {
    throw new AuditUnavailableError(`Invalid audit action_result "${request.action_result}"`);
  }
  /** @type {AuditRecord} */
  const record = {
    event_id: randomUUID(),
    user_id: requireNonEmpty(request.user_id, "user_id"),
    timestamp: new Date(),
    action_type: requireNonEmpty(request.action_type, "action_type"),
    action_result: request.action_result,
    agent_id: requireNonEmpty(request.agent_id, "agent_id"),
  };
  if (request.parent_event_id) {
    record.parent_event_id = request.parent_event_id;
  }

  try {
    const collection = await ensureAuditCollection(await deps.getDb());
    const result = await collection.insertOne(record, DURABLE_WRITE);
    if (!result.acknowledged) {
      throw new Error("Audit insert was not acknowledged");
    }
  } catch (error) {
    throw new AuditUnavailableError("Audit log is unavailable; action refused", { cause: error });
  }
  return record;
}

async function appendOutcome(record, outcome, deps) {
  try {
    await writeAuditRecord({ ...record, action_result: outcome, parent_event_id: record.event_id }, deps);
  } catch (error) {
    // The action has already happened and its 'pending' record is durable, so S-8 holds.
    // Losing the outcome record is worth surfacing, but not worth failing the caller over.
    console.error(`Failed to append ${outcome} outcome for audit event ${record.event_id}`, error);
  }
}

/**
 * Runs `action` only after its audit record is durably written. If the audit write fails the
 * action is refused with AuditUnavailableError and never runs (S-8, fail closed). The outcome
 * (success/failure) is appended as a separate record once the action settles.
 * @template T
 * @param {AuditRequest} request
 * @param {(record: AuditRecord) => Promise<T> | T} action
 * @param {AuditDeps} deps
 * @returns {Promise<T>}
 */
export async function withAudit(request, action, deps) {
  const record = await writeAuditRecord({ ...request, action_result: "pending" }, deps);
  let result;
  try {
    result = await action(record);
  } catch (error) {
    await appendOutcome(record, "failure", deps);
    throw error;
  }
  await appendOutcome(record, "success", deps);
  return result;
}

async function probeAuditWritable(deps) {
  const db = await deps.getDb();
  await ensureAuditCollection(db);
  // A real write with the same durability requirements as audit records; anything weaker (e.g. a
  // ping, or checking for a primary) reports healthy while majority writes would still fail.
  await ensureCappedCollection(db, AGENT_AUDIT_HEARTBEAT_COLLECTION, HEARTBEAT_MAX_BYTES);
  const result = await db.collection(AGENT_AUDIT_HEARTBEAT_COLLECTION).insertOne({ checked_at: new Date() }, DURABLE_WRITE);
  if (!result.acknowledged) {
    throw new Error("Audit heartbeat write was not acknowledged");
  }
}

/**
 * Reports whether agent_audit can currently be written to. Never throws.
 * @param {AuditDeps} deps
 * @returns {Promise<AuditHealth>}
 */
export async function checkAuditHealth(deps) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Audit health check timed out")), HEALTH_CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([probeAuditWritable(deps), timeout]);
    return { healthy: true };
  } catch (error) {
    return { healthy: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}
