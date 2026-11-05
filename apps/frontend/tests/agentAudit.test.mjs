import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AGENT_AUDIT_COLLECTION,
  AGENT_AUDIT_HEARTBEAT_COLLECTION,
  AuditUnavailableError,
  checkAuditHealth,
  withAudit,
  writeAuditRecord,
} from "../lib/agentAuditCore.mjs";

// Minimal stand-in for the parts of mongodb's Db that agentAuditCore uses. No database needed.
function fakeDb(opts = {}) {
  const events = [];
  const inserted = [];
  const heartbeats = [];
  const collections = new Map();
  if (opts.existsUncapped) collections.set(AGENT_AUDIT_COLLECTION, { capped: false });
  let insertCount = 0;

  const auditCollection = {
    async insertOne(doc, options) {
      insertCount++;
      events.push(`insert:${doc.action_result}`);
      if (opts.insertError || opts.failOnInsertNumber === insertCount) {
        throw opts.insertError ?? new Error("insert failed");
      }
      inserted.push({ doc: structuredClone(doc), options });
      return { acknowledged: opts.acknowledged ?? true, insertedId: "id" };
    },
  };
  const heartbeatCollection = {
    async insertOne(_doc, options) {
      if (opts.heartbeatError) throw opts.heartbeatError;
      heartbeats.push({ options });
      return { acknowledged: true, insertedId: "id" };
    },
  };

  const db = {
    async createCollection(name, options) {
      if (collections.has(name)) {
        throw Object.assign(new Error("exists"), { code: 48, codeName: "NamespaceExists" });
      }
      collections.set(name, options);
    },
    listCollections(filter) {
      const options = collections.get(filter.name);
      return { toArray: async () => (options ? [{ name: filter.name, options }] : []) };
    },
    collection(name) {
      if (name === AGENT_AUDIT_COLLECTION) return auditCollection;
      if (name === AGENT_AUDIT_HEARTBEAT_COLLECTION) return heartbeatCollection;
      throw new Error(`unexpected collection ${name}`);
    },
  };
  // A fresh object per test also gives a fresh ensureAuditCollection cache entry.
  const deps = { getDb: async () => db };
  return { deps, events, inserted, heartbeats, getCollectionOptions: (name = AGENT_AUDIT_COLLECTION) => collections.get(name) };
}

const DURABLE = { writeConcern: { w: "majority", j: true, wtimeoutMS: 5000 } };
const request = { user_id: "user-1", action_type: "experiment_start", agent_id: "chell-v1" };
const unreachable = { getDb: async () => { throw new Error("no connection"); } };

test("audit insert failure refuses the action", async () => {
  const { deps, events } = fakeDb({ insertError: new Error("mongo down") });
  let ran = false;
  await assert.rejects(
    withAudit(request, () => { ran = true; }, deps),
    (error) => error instanceof AuditUnavailableError && error.cause.message === "mongo down",
  );
  assert.equal(ran, false);
  assert.deepEqual(events, ["insert:pending"]);
});

test("unacknowledged audit insert refuses the action", async () => {
  const { deps } = fakeDb({ acknowledged: false });
  let ran = false;
  await assert.rejects(withAudit(request, () => { ran = true; }, deps), AuditUnavailableError);
  assert.equal(ran, false);
});

test("failure to get the database refuses the action", async () => {
  let ran = false;
  await assert.rejects(withAudit(request, () => { ran = true; }, unreachable), AuditUnavailableError);
  assert.equal(ran, false);
});

test("a pre-existing non-capped agent_audit collection refuses the action", async () => {
  const { deps } = fakeDb({ existsUncapped: true });
  let ran = false;
  await assert.rejects(withAudit(request, () => { ran = true; }, deps), AuditUnavailableError);
  assert.equal(ran, false);
});

test("invalid record fields refuse the action", async () => {
  const { deps, events } = fakeDb();
  let ran = false;
  await assert.rejects(withAudit({ ...request, user_id: "" }, () => { ran = true; }, deps), AuditUnavailableError);
  assert.equal(ran, false);
  assert.deepEqual(events, []);
});

test("successful insert runs the action after the record is written, with all six fields", async () => {
  const { deps, events, inserted, getCollectionOptions } = fakeDb();
  const result = await withAudit(request, (record) => {
    events.push("action");
    return `ran ${record.event_id}`;
  }, deps);

  assert.deepEqual(events, ["insert:pending", "action", "insert:success"]);
  assert.equal(getCollectionOptions()?.capped, true);

  const pending = inserted[0].doc;
  assert.equal(result, `ran ${pending.event_id}`);
  for (const field of ["event_id", "user_id", "timestamp", "action_type", "action_result", "agent_id"]) {
    assert.ok(pending[field] != null, `missing ${field}`);
  }
  assert.match(pending.event_id, /^[0-9a-f-]{36}$/);
  assert.ok(pending.timestamp instanceof Date);
  assert.equal(pending.user_id, "user-1");
  assert.equal(pending.action_type, "experiment_start");
  assert.equal(pending.agent_id, "chell-v1");
  assert.equal(pending.action_result, "pending");
  assert.deepEqual(inserted[0].options, DURABLE);

  const outcome = inserted[1].doc;
  assert.equal(outcome.action_result, "success");
  assert.equal(outcome.parent_event_id, pending.event_id);
  assert.notEqual(outcome.event_id, pending.event_id);
});

test("a throwing action is recorded as a failure and the error propagates", async () => {
  const { deps, inserted } = fakeDb();
  await assert.rejects(withAudit(request, () => { throw new Error("boom"); }, deps), /boom/);
  assert.deepEqual(inserted.map((i) => i.doc.action_result), ["pending", "failure"]);
});

test("a lost outcome record does not fail an action that already ran", async (t) => {
  const { deps } = fakeDb({ failOnInsertNumber: 2 });
  t.mock.method(console, "error", () => {});
  assert.equal(await withAudit(request, () => 42, deps), 42);
});

test("writeAuditRecord rejects unknown action_result values", async () => {
  const { deps } = fakeDb();
  await assert.rejects(writeAuditRecord({ ...request, action_result: "deleted" }, deps), AuditUnavailableError);
});

test("health check does a durable heartbeat write without touching agent_audit", async () => {
  const { deps, inserted, heartbeats, getCollectionOptions } = fakeDb();
  assert.deepEqual(await checkAuditHealth(deps), { healthy: true });
  assert.equal(getCollectionOptions()?.capped, true);
  assert.equal(getCollectionOptions(AGENT_AUDIT_HEARTBEAT_COLLECTION)?.capped, true);
  assert.deepEqual(heartbeats, [{ options: DURABLE }]);
  assert.deepEqual(inserted, []);
});

test("health check is unhealthy when a majority write cannot be acknowledged", async () => {
  const writeConcernTimeout = Object.assign(new Error("waiting for replication timed out"), { code: 64 });
  const { deps } = fakeDb({ heartbeatError: writeConcernTimeout });
  assert.deepEqual(await checkAuditHealth(deps), { healthy: false, reason: "waiting for replication timed out" });
});

test("health check is unhealthy when agent_audit exists but is not capped", async () => {
  const { deps, heartbeats } = fakeDb({ existsUncapped: true });
  assert.equal((await checkAuditHealth(deps)).healthy, false);
  assert.deepEqual(heartbeats, []);
});

test("health check is unhealthy when the database is unreachable", async () => {
  assert.equal((await checkAuditHealth(unreachable)).healthy, false);
});

// S-8: records must not be modifiable or deletable through any system interface.
test("no frontend code calls update or delete operations on agent_audit", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  // `cache` is agentAuditCore's in-memory Map of created collections, not a database handle.
  const mutating = /(?<!cache)\.(update(One|Many)?|delete(One|Many)?|replaceOne|findOneAnd\w+|bulkWrite|drop|rename)\s*\(/;
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry)) {
        const source = readFileSync(path, "utf8");
        const touchesAudit = source.includes(AGENT_AUDIT_COLLECTION) || source.includes("agentAudit");
        if (touchesAudit && mutating.test(source)) offenders.push(path);
      }
    }
  };
  for (const dir of ["app", "lib", "utils"]) walk(join(root, dir));
  assert.deepEqual(offenders, []);
});
