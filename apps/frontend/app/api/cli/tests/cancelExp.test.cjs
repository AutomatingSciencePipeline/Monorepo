const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers.cjs');

const OWNER = '507f1f77bcf86cd799439011';
const EID = '507f1f77bcf86cd799439014';
const TOKEN = 'secret-token-value';

class AuditUnavailableError extends Error {}

// Loads the real route with authentication and the cancel service mocked.
// The service's own logic is covered by tests/experimentCancel.test.mjs.
function harness(options = {}) {
  const calls = { auth: [], cancel: [] };
  const auth = {
    tokenBasedAuth: async (token) => {
      calls.auth.push(token);
      if (options.authStatus) return Response.json({ response: 'Missing User' }, { status: options.authStatus });
      return Response.json({ _id: options.identity ?? OWNER, email: 'owner@example.test', role: options.role ?? 'user' });
    },
  };
  const service = {
    AuditUnavailableError,
    cancelExperimentFromCli: async (eid, userId) => {
      calls.cancel.push({ eid, userId });
      if (options.serviceError) throw options.serviceError;
      return options.result ?? { ok: true, outcome: 'cancel_requested', status: 'CANCELLED' };
    },
  };
  const route = loadSource('app/api/cli/cancelExp/route.ts', {
    '../../../../tokenAuth': auth,
    '../../../../lib/experimentCancel': service,
  });
  return { post: route.POST, calls };
}

function jsonRequest(body) {
  return new Request('http://localhost/api/cli/cancelExp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = { token: TOKEN, eid: EID };

test('cancelExp: accepted cancellation returns 202 and does not claim the Job has stopped', async () => {
  const { post, calls } = harness();
  const response = await post(jsonRequest(VALID));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    success: true, eid: EID, outcome: 'cancel_requested', status: 'CANCELLED', job_termination_confirmed: false,
  });
  assert.deepEqual(calls.cancel, [{ eid: EID, userId: OWNER }]);
});

test('cancelExp: a repeated cancel returns 200 with already_cancelled', async () => {
  const { post } = harness({ result: { ok: true, outcome: 'already_cancelled', status: 'CANCELLED' } });
  const response = await post(jsonRequest(VALID));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).outcome, 'already_cancelled');
});

test('cancelExp: the service receives the authenticated identity, not request fields', async () => {
  const { post, calls } = harness({ identity: OWNER });
  await post(jsonRequest({ ...VALID, userId: '507f1f77bcf86cd799439013', role: 'admin', isAdmin: true }));
  assert.deepEqual(calls.cancel, [{ eid: EID, userId: OWNER }]);
});

for (const [label, body] of [
  ['malformed JSON', '{not json'],
  ['a JSON array', '[]'],
  ['a missing token', { eid: EID }],
  ['an empty token', { token: '  ', eid: EID }],
  ['a missing eid', { token: TOKEN }],
  ['a short eid', { token: TOKEN, eid: '1234' }],
  ['a non-hex eid', { token: TOKEN, eid: 'z'.repeat(24) }],
  ['an object eid', { token: TOKEN, eid: { $ne: null } }],
]) {
  test(`cancelExp: ${label} returns 400 before authentication or cancellation`, async () => {
    const { post, calls } = harness();
    const response = await post(jsonRequest(body));
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assert.equal(calls.cancel.length, 0);
  });
}

test('cancelExp: failed authentication returns 401 and cancels nothing', async () => {
  const { post, calls } = harness({ authStatus: 401 });
  const response = await post(jsonRequest(VALID));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, 'auth_error');
  assert.equal(calls.cancel.length, 0);
});

for (const [result, status, extra] of [
  [{ ok: false, error: 'not_found' }, 404, {}],
  [{ ok: false, error: 'forbidden' }, 403, {}],
  [{ ok: false, error: 'not_cancellable', status: 'COMPLETED' }, 409, { status: 'COMPLETED' }],
  [{ ok: false, error: 'backend_error' }, 502, {}],
  [{ ok: false, error: 'status_update_failed', jobDeletionRequested: true }, 500, { job_deletion_requested: true }],
]) {
  test(`cancelExp: ${result.error} maps to HTTP ${status}`, async () => {
    const { post } = harness({ result });
    const response = await post(jsonRequest(VALID));
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { success: false, error: result.error, ...extra });
  });
}

test('cancelExp: audit unavailable returns 503 degraded', async () => {
  const { post } = harness({ serviceError: new AuditUnavailableError('down') });
  const response = await post(jsonRequest(VALID));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { success: false, error: 'degraded' });
});

test('cancelExp: unexpected errors return a fixed 500 without internal details or the token', async () => {
  const { post } = harness({ serviceError: new Error(`connection to mongodb failed for ${TOKEN}`) });
  const response = await post(jsonRequest(VALID));
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { success: false, error: 'Other' });
  assert.doesNotMatch(text, /mongodb|secret-token/);
});

test('cancelExp: responses never echo the token', async () => {
  for (const options of [{}, { authStatus: 401 }, { result: { ok: false, error: 'not_found' } }]) {
    const { post } = harness(options);
    assert.doesNotMatch(await (await post(jsonRequest(VALID))).text(), /secret-token/);
  }
});
