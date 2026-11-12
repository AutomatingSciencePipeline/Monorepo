const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { loadSource, frontendRequire } = require('../app/api/cli/tests/helpers.cjs');

const mongodb = frontendRequire('mongodb');
const OWNER = '507f1f77bcf86cd799439011';
const OTHER = '507f1f77bcf86cd799439012';
const EID = '507f1f77bcf86cd799439013';
const FID = '507f1f77bcf86cd799439014';

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    const actual = key.split('.').reduce((value, part) => value?.[part], document);
    if (actual instanceof mongodb.ObjectId || expected instanceof mongodb.ObjectId) {
      return actual instanceof mongodb.ObjectId && expected instanceof mongodb.ObjectId && actual.equals(expected);
    }
    return actual !== undefined && actual === expected;
  });
}

function setup(options = {}) {
  const calls = { queries: [], directory: [], writes: [], backend: [], provider: [], parse: [], reads: [], uploads: [] };
  const session = Object.hasOwn(options, 'session') ? options.session
    : { user: { id: OWNER, email: 'stale@example.test', role: options.sessionRole ?? 'user' } };
  const users = options.users ?? [{ _id: new mongodb.ObjectId(OWNER), email: 'trusted@example.test', role: options.role ?? 'user' }];
  const files = options.files ?? [{ _id: new mongodb.ObjectId(FID), metadata: { userId: OWNER, hash: 'hash' }, filename: 'program.zip' }];
  const documents = {
    users,
    accounts: options.accounts ?? [{ provider: 'github', providerAccountId: '123', userId: new mongodb.ObjectId(OWNER) }],
    experiments: options.experiments ?? [{ _id: new mongodb.ObjectId(EID), creator: OWNER, sharedUsers: [OTHER] }],
    'fileBucket.files': files,
  };
  const client = {
    db: () => ({ collection: (name) => ({
      findOne: async (query) => {
        calls.queries.push({ name, query });
        if (options.dbError) throw new Error('Mock database failure');
        return documents[name]?.find((doc) => matches(doc, query)) ?? null;
      },
      find: () => {
        calls.directory.push(name);
        return { toArray: async () => documents[name] };
      },
      updateOne: async (query, update) => {
        calls.writes.push({ name, query, update });
        return { modifiedCount: 1 };
      },
      insertOne: async (document) => {
        calls.writes.push({ name, document });
        return { acknowledged: true, insertedId: new mongodb.ObjectId(EID) };
      },
    }) }),
  };
  const database = { __esModule: true, default: Promise.resolve(client), DB_NAME: 'test-db', COLLECTION_EXPERIMENTS: 'experiments' };
  const auth = { auth: async () => {
    if (options.authError) throw new Error('Mock session failure');
    return session;
  } };
  const actions = loadSource('lib/mongodb_funcs.ts', { './mongodb': database, '../auth': auth, './experimentCancel': {} });
  let tokenAuth = {
    tokenBasedAuth: async (token) => Response.json(
      token === 'valid-token' ? { _id: options.tokenUser ?? OWNER, role: options.tokenRole ?? 'user' } : { error: 'Unauthorized' },
      { status: token === 'valid-token' ? 200 : 401 },
    ),
  };
  if (options.realTokenAuth) {
    tokenAuth = loadSource('tokenAuth.ts', { './lib/mongodb': database }, {
      fetch: async (url, init) => {
        calls.provider.push({ url, init });
        return Response.json({ id: 123, login: 'fixture' }, { status: options.githubStatus ?? 200 });
      },
    });
  }
  const start = loadSource('app/api/experiments/start/[expIdToStart]/route.tsx', {
    '../../../../../auth': auth,
    '../../../../../lib/backendAuth': { backendAuthHeaders: async () => ({ Authorization: 'Bearer service-token' }) },
    '../../../../../lib/mongodb': database,
    '../../../../../tokenAuth': tokenAuth,
  }, {
    process: { env: {} },
    fetch: async (url, init) => {
      calls.backend.push({ url, init });
      if (options.backendError) throw new Error('Mock backend unavailable');
      return new Response(null, { status: options.backendStatus ?? 200 });
    },
    console: { ...console, warn: () => {} },
  }).POST;

  class GridFSBucket {
    find(query) {
      calls.queries.push({ name: 'fileBucket.files', query });
      return { toArray: async () => files.filter((file) => matches(file, query)) };
    }
    openUploadStream(filename, settings) {
      calls.uploads.push({ filename, settings });
      const stream = new EventEmitter();
      stream.id = new mongodb.ObjectId(FID);
      stream.filename = filename;
      return stream;
    }
  }
  const upload = loadSource('app/api/files/uploadFile/route.ts', {
    '../../../../auth': auth,
    '../../../../lib/mongodb': database,
    mongodb: { ...mongodb, GridFSBucket },
    formidable: () => ({ parse: (_stream, callback) => {
      calls.parse.push(true);
      callback(null, { userId: [OTHER] }, { file: [{ filepath: '/mock/file', originalFilename: 'program.zip', hash: 'hash' }] });
    } }),
    stream: { Readable },
    fs: { createReadStream: (filename) => {
      calls.reads.push(filename);
      return { pipe: (stream) => { queueMicrotask(() => stream.emit('finish')); return stream; } };
    } },
  }).POST;
  return { actions, start, upload, calls };
}

function request(body = { id: EID }) {
  return new Request('http://localhost/test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

function startRequest(setupResult, body, id = EID) {
  return setupResult.start(request(body), { params: Promise.resolve({ expIdToStart: id }) });
}

function noEffects(calls) {
  for (const name of ['writes', 'backend', 'uploads', 'reads']) {
    assert.equal(calls[name].length, 0, `Denied request caused ${name}`);
  }
}

for (const options of [
  { session: null }, { session: { user: {} } }, { role: 'user' }, { role: 'privileged' },
  { role: 'user', sessionRole: 'admin' }, { users: [] },
]) {
  test(`admin actions deny ${JSON.stringify(options)} without directory access or mutation`, async () => {
    const h = setup(options);
    await assert.rejects(h.actions.getUsers());
    await assert.rejects(h.actions.updateUserRole(OTHER, 'admin'));
    assert.equal(h.calls.directory.length, 0);
    noEffects(h.calls);
  });
}

test('current DB admin can list users and set all supported roles despite stale session role', async () => {
  const h = setup({ role: 'admin', sessionRole: 'user' });
  const users = await h.actions.getUsers();
  assert.equal(users[0]._id, OWNER);
  for (const role of ['user', 'privileged', 'admin']) {
    await h.actions.updateUserRole(OTHER, role);
    assert.equal(String(h.calls.writes.at(-1).query._id), OTHER);
    assert.equal(h.calls.writes.at(-1).update.$set.role, role);
  }
});

test('admin role updates reject invalid IDs and roles with no writes', async () => {
  const h = setup({ role: 'admin' });
  await assert.rejects(h.actions.updateUserRole('invalid', 'admin'));
  await assert.rejects(h.actions.updateUserRole(OTHER, 'superuser'));
  noEffects(h.calls);
});

test('admin lookup selects the authenticated user when another admin appears first', async () => {
  const h = setup({ users: [
    { _id: new mongodb.ObjectId(OTHER), role: 'admin' },
    { _id: new mongodb.ObjectId(OWNER), role: 'user' },
  ] });
  await assert.rejects(h.actions.getUsers());
  await assert.rejects(h.actions.updateUserRole(OWNER, 'admin'));
  assert.equal(h.calls.directory.length, 0);
  noEffects(h.calls);
});

test('Web submission selects current identity among multiple DB users', async () => {
  const h = setup({ users: [
    { _id: new mongodb.ObjectId(OTHER), role: 'admin', email: 'other@example.test' },
    { _id: new mongodb.ObjectId(OWNER), role: 'user', email: 'owner@example.test' },
  ] });
  await h.actions.submitExperiment({}, OWNER, '', 'admin', FID);
  assert.equal(h.calls.writes[0].document.creator, OWNER);
  assert.equal(h.calls.writes[0].document.creatorRole, 'user');
  assert.equal(h.calls.writes[0].document.creatorEmail, 'owner@example.test');
});

test('Web submission stores uppercase file IDs canonically', async () => {
  const h = setup();
  await h.actions.submitExperiment({}, OWNER, '', 'user', FID.toUpperCase());
  assert.equal(h.calls.writes[0].document.file, FID);
});

test('Web submission initializes server fields without mutating supplied settings', async () => {
  const h = setup();
  const values = Object.freeze({
    _id: 'caller-id', name: 'Settings retained', sharedUsers: [OTHER],
    status: 'COMPLETED', passes: 99, fails: 88, created: 1, finished: true,
    trialResultLineNumber: '7', totalExperimentRuns: 55, expId: 'caller-exp',
    startedAtEpochMillis: 1, finishedAtEpochMilliseconds: 2, finishedAtEpochMillis: 3, expToRun: 42,
    configs: { injected: true }, experimentType: 'python', postProcess: true,
    archivedFromStatus: 'COMPLETED', unknownServerField: 'injected',
  });
  assert.equal(await h.actions.submitExperiment(values, OWNER, '', 'admin', FID), EID);
  const stored = h.calls.writes[0].document;
  assert.equal(Object.hasOwn(stored, '_id'), false);
  assert.equal(Object.hasOwn(stored, 'expId'), false);
  assert.equal(Object.hasOwn(stored, 'startedAtEpochMillis'), false);
  assert.equal(Object.hasOwn(stored, 'finishedAtEpochMilliseconds'), false);
  assert.equal(Object.hasOwn(stored, 'finishedAtEpochMillis'), false);
  assert.equal(Object.hasOwn(stored, 'expToRun'), false);
  for (const field of ['configs', 'experimentType', 'postProcess', 'archivedFromStatus', 'unknownServerField']) {
    assert.equal(Object.hasOwn(stored, field), false);
  }
  assert.deepEqual(Array.from(stored.sharedUsers), []);
  assert.equal(stored.status, 'CREATED');
  assert.equal(stored.passes, 0);
  assert.equal(stored.fails, 0);
  assert.equal(stored.finished, false);
  assert.equal(stored.totalExperimentRuns, 0);
  assert.notEqual(stored.created, 1);
  assert.equal(stored.name, 'Settings retained');
  assert.equal(stored.trialResultLineNumber, 7);
  assert.equal(values.status, 'COMPLETED');
});

test('Web submission rejects non-object settings without insertion', async () => {
  for (const values of [null, undefined, [], 'settings', 7, true]) {
    const h = setup();
    await assert.rejects(h.actions.submitExperiment(values, OWNER, '', 'user', FID));
    noEffects(h.calls);
  }
});

test('submission file ownership checks preserve BSON ID types', async () => {
  const h = setup({ files: [{ _id: FID, metadata: { userId: OWNER } }] });
  await assert.rejects(h.actions.submitExperiment({}, OWNER, '', 'user', FID));
  noEffects(h.calls);
});

test('Web submission overrides forged email, role, and creator with current DB identity', async () => {
  const h = setup({ sessionRole: 'admin' });
  const result = await h.actions.submitExperiment({
    creator: OTHER, creatorEmail: 'forged@example.test', creatorRole: 'admin', name: 'Fixture',
  }, OWNER, 'forged@example.test', 'privileged', FID);
  assert.equal(result, EID);
  const stored = h.calls.writes[0].document;
  assert.equal(stored.creator, OWNER);
  assert.equal(stored.creatorEmail, 'trusted@example.test');
  assert.equal(stored.creatorRole, 'user');
  assert.equal(stored.file, FID);
  assert.equal(stored.trialResultLineNumber, 1);
});

for (const role of ['admin', 'privileged']) {
  test(`Web submission retains trusted ${role} role`, async () => {
    const h = setup({ role });
    await h.actions.submitExperiment({}, OWNER, '', 'user', FID);
    assert.equal(h.calls.writes[0].document.creatorRole, role);
  });
}

for (const options of [{ session: null }, { users: [] }, { files: [] }]) {
  test(`Web submission denies ${JSON.stringify(options)} with no insert`, async () => {
    const h = setup(options);
    await assert.rejects(h.actions.submitExperiment({}, OWNER, '', 'admin', FID));
    noEffects(h.calls);
  });
}

test('Web submission rejects impersonated users and foreign, missing, or malformed file IDs', async () => {
  for (const [uid, fid] of [[OTHER, FID], [OWNER, 'invalid'], [OWNER, EID]]) {
    const h = setup();
    await assert.rejects(h.actions.submitExperiment({}, uid, '', 'admin', fid));
    noEffects(h.calls);
  }
  const h = setup({ files: [{ _id: new mongodb.ObjectId(FID), metadata: { userId: OTHER } }] });
  await assert.rejects(h.actions.submitExperiment({}, OWNER, '', 'user', FID));
  noEffects(h.calls);
});

test('CLI insert helper is no longer exported as an unauthenticated Server Action', () => {
  assert.equal(setup().actions.submitExperimentCLI, undefined);
});

for (const session of [null, { user: {} }]) {
  test('Web upload denies missing identity before multipart parsing or file access', async () => {
    const h = setup({ session });
    assert.equal((await h.upload(request())).status, 401);
    assert.equal(h.calls.parse.length, 0);
    assert.equal(h.calls.queries.length, 0);
    noEffects(h.calls);
  });
}

function uploadRequest() {
  return new Request('http://localhost/test', {
    method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=fixture' }, body: 'mock',
  });
}

test('Web upload ignores forged form owner and writes under session identity', async () => {
  const h = setup({ files: [{ _id: new mongodb.ObjectId(FID), metadata: { userId: OTHER, hash: 'hash' } }] });
  assert.equal((await h.upload(uploadRequest())).status, 200);
  assert.equal(h.calls.queries[0].query['metadata.userId'], OWNER);
  assert.equal(h.calls.uploads[0].settings.metadata.userId, OWNER);
});

test('Web upload reuses only the authenticated owner file', async () => {
  const h = setup();
  const response = await h.upload(uploadRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reuse, true);
  assert.equal(h.calls.queries[0].query['metadata.userId'], OWNER);
  noEffects(h.calls);
});

for (const options of [
  { session: null }, { session: { user: {} } },
  { session: { user: { id: OTHER, role: 'user' } } },
  { session: { user: { id: OTHER, role: 'admin' } } },
  { experiments: [] },
]) {
  test(`start rejects missing identity or ownership ${JSON.stringify(options)} before Flask`, async () => {
    const h = setup(options);
    const missingIdentity = Object.hasOwn(options, 'session') && !options.session?.user?.id;
    assert.equal((await startRequest(h)).status, missingIdentity ? 401 : 404);
    noEffects(h.calls);
  });
}

test('Web owner start preserves existing body and backend contract with empty HTTP 200', async () => {
  const h = setup();
  const response = await startRequest(h);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { response: 'Experiment start requested' });
  assert.equal(h.calls.backend.length, 1);
  const { url, init } = h.calls.backend[0];
  assert.equal(url, 'http://glados-service-backend:5050/experiment');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.headers.Authorization, 'Bearer service-token');
  assert.deepEqual(JSON.parse(init.body), { experiment: { id: EID } });
});

test('start canonicalizes uppercase experiment IDs for backend job names', async () => {
  const h = setup();
  assert.equal((await startRequest(h, { id: EID }, EID.toUpperCase())).status, 200);
  assert.equal(JSON.parse(h.calls.backend[0].init.body).experiment.id, EID);
});

for (const body of [{ id: EID }, { id: EID, token: 'valid-token' }]) {
  test(`start checks the requested experiment even when caller owns a different experiment (${Object.hasOwn(body, 'token') ? 'CLI' : 'Web'})`, async () => {
    const h = setup({ realTokenAuth: true, experiments: [
      { _id: new mongodb.ObjectId(FID), creator: OWNER },
      { _id: new mongodb.ObjectId(EID), creator: OTHER },
    ] });
    assert.equal((await startRequest(h, body)).status, 404);
    noEffects(h.calls);
  });
}

test('start preserves optional backend key without treating it as authentication', async () => {
  const h = setup();
  assert.equal((await startRequest(h, { id: EID, key: 'fixture-key' })).status, 200);
  assert.deepEqual(JSON.parse(h.calls.backend[0].init.body), { experiment: { id: EID, key: 'fixture-key' } });
  const anonymous = setup({ session: null });
  assert.equal((await startRequest(anonymous, { key: 'fixture-key' })).status, 401);
  noEffects(anonymous.calls);
});

for (const realTokenAuth of [false, true]) {
  test(`CLI owner starts with authenticated token (real token auth: ${realTokenAuth})`, async () => {
    const h = setup({ session: null, realTokenAuth });
    assert.equal((await startRequest(h, { id: EID, token: 'valid-token' })).status, 200);
    assert.equal(h.calls.backend.length, 1);
    assert.equal(h.calls.backend[0].init.headers.Authorization, 'Bearer service-token');
    assert.equal(JSON.stringify(h.calls.backend).includes('valid-token'), false);
    if (realTokenAuth) assert.equal(h.calls.provider.length, 1);
  });
}

test('invalid CLI token never falls back to a valid Web session', async () => {
  for (const realTokenAuth of [false, true]) {
    const h = setup({ realTokenAuth, githubStatus: 401 });
    assert.equal((await startRequest(h, { id: EID, token: 'invalid-token' })).status, 401);
    noEffects(h.calls);
  }
});

test('CLI start does not provision accounts when an unregistered token cannot own the experiment', async () => {
  const h = setup({ session: null, realTokenAuth: true, accounts: [], users: [] });
  assert.equal((await startRequest(h, { id: EID, token: 'valid-token' })).status, 401);
  noEffects(h.calls);
});

for (const tokenRole of ['user', 'admin']) {
  test(`foreign CLI ${tokenRole} token cannot use owner Web cookie or shared-read access to start`, async () => {
    const h = setup({ tokenUser: OTHER, tokenRole });
    assert.equal((await startRequest(h, { id: EID, token: 'valid-token' })).status, 404);
    noEffects(h.calls);
  });
}

for (const body of [null, [], true, 'token', 42, { id: OTHER }, { token: '' }, { token: '   ' }, { token: 42 }, { token: null }, { key: {} }]) {
  test(`start rejects malformed body ${JSON.stringify(body)} without effects`, async () => {
    const h = setup();
    assert.equal((await startRequest(h, body)).status, 400);
    noEffects(h.calls);
  });
}

test('start rejects invalid path and malformed JSON with no effects', async () => {
  const h = setup();
  assert.equal((await startRequest(h, {}, 'invalid')).status, 400);
  const req = new Request('http://localhost/test', { method: 'POST', body: '{' });
  assert.equal((await h.start(req, { params: Promise.resolve({ expIdToStart: EID }) })).status, 400);
  noEffects(h.calls);
});

for (const options of [{ backendStatus: 503 }, { backendError: true }, { dbError: true }, { authError: true }]) {
  test(`start does not report success on dependency failure ${JSON.stringify(options)}`, async () => {
    const h = setup(options);
    assert.equal((await startRequest(h)).status, 500);
    assert.equal(h.calls.writes.length, 0);
    if (options.dbError || options.authError) assert.equal(h.calls.backend.length, 0);
  });
}
