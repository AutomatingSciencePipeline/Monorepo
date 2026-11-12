const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const { loadSource, frontendRequire } = require('../app/api/cli/tests/helpers.cjs');

const mongodb = frontendRequire('mongodb');
const OWNER = '507f1f77bcf86cd799439011';
const SHARED = '507f1f77bcf86cd799439012';
const FOREIGN = '507f1f77bcf86cd799439013';
const ADMIN = '507f1f77bcf86cd799439014';
const EOWN = '507f1f77bcf86cd799439021';
const ESHARED = '507f1f77bcf86cd799439022';
const EFOREIGN = '507f1f77bcf86cd799439023';
const ELAUNDER = '507f1f77bcf86cd799439024';
const FOWN = '507f1f77bcf86cd799439031';
const FSHARED = '507f1f77bcf86cd799439032';
const FFOREIGN = '507f1f77bcf86cd799439033';
const FDECOY = '507f1f77bcf86cd799439034';
const FNEW = '507f1f77bcf86cd799439035';
const UNKNOWN = '507f1f77bcf86cd799439099';
const LINK_ID = '507f1f77bcf86cd799439041';
const VALID_LINK = 'valid-fixture-share-link';
const ids = (values) => Array.from(values, (value) => String(value._id));
const oid = (id) => new mongodb.ObjectId(id);

function equal(actual, expected) {
  if (actual instanceof mongodb.ObjectId || expected instanceof mongodb.ObjectId) {
    return actual instanceof mongodb.ObjectId && expected instanceof mongodb.ObjectId && actual.equals(expected);
  }
  if (actual instanceof Date || expected instanceof Date) return +actual === +expected;
  return actual === expected;
}

// Evaluate every predicate, including array membership and compound authorization queries.
function matches(document, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((condition) => matches(document, condition));
    if (key === '$and') return expected.every((condition) => matches(document, condition));
    if (key === '$nor') return expected.every((condition) => !matches(document, condition));
    assert.equal(key.startsWith('$'), false, `Unsupported query operator ${key}`);
    const actual = key.split('.').reduce((value, part) => value?.[part], document);
    if (Object.prototype.toString.call(expected) === '[object RegExp]') {
      return typeof actual === 'string' && new RegExp(expected.source, expected.flags).test(actual);
    }
    if (expected && typeof expected === 'object' && !(expected instanceof mongodb.ObjectId) && !(expected instanceof Date)) {
      const operators = Object.keys(expected);
      if (operators.some((operator) => operator.startsWith('$'))) {
        return operators.every((operator) => {
          const value = expected[operator];
          const contained = (candidate) => Array.isArray(actual)
            ? actual.some((entry) => equal(entry, candidate)) : equal(actual, candidate);
          if (operator === '$in') return value.some(contained);
          if (operator === '$nin') return value.every((candidate) => !contained(candidate));
          if (operator === '$eq') return contained(value);
          if (operator === '$ne') return !contained(value);
          if (operator === '$exists') return (actual !== undefined) === value;
          if (operator === '$type' && value === 'array') return Array.isArray(actual);
          if (operator === '$gt') return actual > value;
          if (operator === '$gte') return actual >= value;
          if (operator === '$lt') return actual < value;
          if (operator === '$lte') return actual <= value;
          assert.fail(`Unsupported field operator ${operator}`);
        });
      }
    }
    return Array.isArray(actual) ? actual.some((entry) => equal(entry, expected)) : equal(actual, expected);
  });
}

function setPath(document, path, value) {
  const parts = path.split('.');
  const field = parts.pop();
  let target = document;
  for (const part of parts) target = target[part] ??= {};
  target[field] = value;
}

function setup(options = {}) {
  const calls = { queries: [], writes: [], downloads: [], uploads: [], bucketDeletes: [], backend: [] };
  const currentId = options.userId ?? OWNER;
  const session = Object.hasOwn(options, 'session') ? options.session
    : { user: { id: currentId, role: options.sessionRole ?? 'user' } };
  const file = (id, userId, hash) => ({
    _id: oid(id), filename: `${id}.zip`, contentType: 'application/zip', length: 7, chunkSize: 255,
    uploadDate: new Date('2026-01-01T00:00:00Z'),
    metadata: { userId, hash, lastUsedDate: new Date('2026-01-02T00:00:00Z'), original: 'preserve-me' },
  });
  const documents = {
    users: options.users ?? [
      { _id: oid(ADMIN), role: 'admin' },
      { _id: oid(FOREIGN), role: 'user' },
      { _id: oid(SHARED), role: options.role ?? 'user' },
      { _id: oid(OWNER), role: options.ownerRole ?? 'user' },
    ],
    experiments: options.experiments ?? [
      { _id: oid(EFOREIGN), creator: FOREIGN, file: FFOREIGN, sharedUsers: [], name: 'Foreign' },
      { _id: oid(EOWN), creator: OWNER, file: FOWN, sharedUsers: [SHARED], name: 'Owned', status: 'RUNNING' },
      { _id: oid(ESHARED), creator: FOREIGN, file: FSHARED, sharedUsers: [SHARED], name: 'Shared' },
      // A fabricated reference must not grant access to another user's file.
      { _id: oid(ELAUNDER), creator: SHARED, file: FFOREIGN, sharedUsers: [SHARED], name: 'Forged reference' },
    ],
    'fileBucket.files': options.files ?? [
      file(FFOREIGN, FOREIGN, 'foreign-hash'), file(FOWN, OWNER, 'owner-hash'),
      file(FSHARED, FOREIGN, 'shared-hash'), file(FDECOY, SHARED, 'decoy-hash'),
    ],
    shareLinks: options.shareLinks ?? [
      { _id: oid(UNKNOWN), link: 'other-link', experimentId: EFOREIGN, expiration: new Date('2099-01-01') },
      { _id: oid(LINK_ID), link: VALID_LINK, experimentId: EOWN, expiration: new Date('2099-01-01') },
    ],
  };
  for (const bucket of ['logsBucket', 'resultsBucket', 'zipsBucket']) {
    documents[`${bucket}.files`] = [
      { _id: oid(FFOREIGN), filename: 'foreign', metadata: { experimentId: EFOREIGN } },
      { _id: oid(FOWN), filename: 'owned', metadata: { experimentId: EOWN } },
    ];
  }
  const initial = JSON.stringify(documents);
  function cursor(name, query) {
    let values = (documents[name] ?? []).filter((document) => matches(document, query));
    return {
      sort(fields) {
        values = [...values].sort((a, b) => {
          for (const [path, direction] of Object.entries(fields)) {
            const read = (value) => path.split('.').reduce((target, part) => target?.[part], value);
            if (read(a) < read(b)) return -direction;
            if (read(a) > read(b)) return direction;
          }
          return 0;
        });
        return this;
      },
      limit(count) { values = values.slice(0, count); return this; },
      toArray: async () => values,
    };
  }
  const collection = (name) => ({
    findOne: async (query) => {
      calls.queries.push({ name, query });
      return documents[name]?.find((document) => matches(document, query)) ?? null;
    },
    find: (query = {}) => { calls.queries.push({ name, query }); return cursor(name, query); },
    updateOne: async (query, update) => {
      calls.writes.push({ name, query, update });
      const document = documents[name]?.find((candidate) => matches(candidate, query));
      if (!document) return { matchedCount: 0, modifiedCount: 0 };
      for (const [operator, values] of Object.entries(update)) {
        for (const [field, value] of Object.entries(values)) {
          if (operator === '$set') setPath(document, field, value);
          else if (operator === '$push') document[field] = [...(document[field] ?? []), value];
          else if (operator === '$addToSet') { if (!(document[field] ?? []).includes(value)) document[field] = [...(document[field] ?? []), value]; }
          else if (operator === '$pull') document[field] = (document[field] ?? []).filter((entry) => !equal(entry, value));
          else assert.fail(`Unsupported update operator ${operator}`);
        }
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
    deleteOne: async (query) => {
      calls.writes.push({ name, query, operation: 'delete' });
      const index = documents[name]?.findIndex((candidate) => matches(candidate, query)) ?? -1;
      if (index < 0) return { deletedCount: 0 };
      documents[name].splice(index, 1);
      return { deletedCount: 1 };
    },
    insertOne: async (document) => {
      calls.writes.push({ name, document, operation: 'insert' });
      (documents[name] ??= []).push(document);
      return { acknowledged: true, insertedId: oid(LINK_ID) };
    },
  });
  const client = { db: () => ({ collection }) };
  class GridFSBucket {
    constructor(_db, settings) { this.name = settings.bucketName; }
    find(query) {
      calls.queries.push({ name: `${this.name}.files`, query });
      return cursor(`${this.name}.files`, query);
    }
    openDownloadStream(id) {
      calls.downloads.push({ bucket: this.name, id: String(id) });
      assert.ok(documents[`${this.name}.files`]?.some((candidate) => equal(candidate._id, id)), 'Download must select an existing file');
      return Readable.from([Buffer.from('fixture'), Buffer.from('-contents')]);
    }
    openUploadStream(filename, settings) {
      const chunks = [];
      const stream = new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
      stream.id = oid(FNEW);
      calls.uploads.push({ bucket: this.name, filename, settings, chunks });
      return stream;
    }
    async delete(id) {
      calls.bucketDeletes.push({ bucket: this.name, id: String(id) });
      const files = documents[`${this.name}.files`];
      const index = files.findIndex((candidate) => equal(candidate._id, id));
      if (index >= 0) files.splice(index, 1);
    }
  }
  const database = { __esModule: true, default: Promise.resolve(client), DB_NAME: 'test-db', COLLECTION_EXPERIMENTS: 'experiments', COLLECTION_SHARE_LINKS: 'shareLinks' };
  const globals = {
    process: { env: options.backendPort ? { BACKEND_PORT: options.backendPort } : {} },
    AbortSignal,
    fetch: async (url, init) => {
      calls.backend.push({ url, init });
      return new Response(null, { status: options.backendStatus ?? 200 });
    },
  };
  const cancelCore = loadSource('lib/experimentCancelCore.mjs');
  const cancelStore = loadSource('lib/experimentCancelStore.ts', {
    './mongodb': database,
    './backendAuth': { backendAuthHeaders: async () => ({ Authorization: 'Bearer service-token' }) },
    './experimentCancelCore.mjs': cancelCore,
  }, globals);
  const cancellation = loadSource('lib/experimentCancel.ts', {
    './agentAudit': { withAudit: async (_request, action) => action() },
    './experimentCancelCore.mjs': cancelCore,
    './experimentCancelStore': cancelStore,
  });
  const actions = loadSource('lib/mongodb_funcs.ts', {
    './mongodb': database,
    '../auth': { auth: async () => session },
    './experimentCancel': cancellation,
    mongodb: { ...mongodb, GridFSBucket },
  }, globals);
  return { actions, cancellation, calls, documents, initial };
}

// cancelExperimentById reports expected refusals as { ok: false } instead of rejecting
async function refusedCancel(h, action) {
  let result;
  try { result = await action(); } catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    noEffects(h);
    return;
  }
  assert.equal(result?.ok, false, 'Denied cancellation reported success');
  assert.equal(typeof result?.message, 'string');
  noEffects(h);
}

function noEffects(h) {
  for (const name of ['writes', 'downloads', 'uploads', 'bucketDeletes', 'backend']) {
    assert.equal(h.calls[name].length, 0, `Denied call caused ${name}`);
  }
  assert.equal(JSON.stringify(h.documents), h.initial, 'Denied call changed in-memory metadata');
}

test('CLI cancellation uses the service credential and canonical Job ID through the shared store', async () => {
  const h = setup();
  const result = await h.cancellation.cancelExperimentFromCli(EOWN.toUpperCase(), OWNER);
  assert.equal(result.ok, true);
  assert.equal(h.calls.backend.length, 1);
  const { init } = h.calls.backend[0];
  assert.equal(new Headers(init.headers).get('authorization'), 'Bearer service-token');
  assert.equal(JSON.parse(init.body).jobName, 'runner-' + EOWN);
  assert.equal(h.documents.experiments.find((document) => String(document._id) === EOWN).status, 'CANCELLED');
});

test('shared CLI users cannot use the service credential to cancel another owner\'s experiment', async () => {
  const h = setup();
  const result = await h.cancellation.cancelExperimentFromCli(EOWN, SHARED);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'forbidden');
  noEffects(h);
});

async function refused(h, action) {
  let result;
  try { result = await action(); } catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    noEffects(h);
    return;
  }
  assert.ok(result === undefined || result === null || result === false, 'Denied action returned successful data');
  noEffects(h);
}

for (const userId of [OWNER, SHARED]) {
  test(`experiment read permits ${userId === OWNER ? 'owner' : 'shared reader'} and selects the requested experiment`, async () => {
    const h = setup({ userId });
    const result = await h.actions.getDocumentFromId(EOWN);
    assert.equal(result._id, EOWN);
    assert.equal(result.creator, OWNER);
    assert.equal(result.name, 'Owned');
    noEffects(h);
  });
}

for (const options of [{ userId: FOREIGN }, { userId: ADMIN }, { userId: SHARED, sessionRole: 'admin' }, { session: null }, { session: { user: {} } }]) {
  test(`experiment read returns null when unauthorized ${JSON.stringify(options)}`, async () => {
    const h = setup(options);
    const target = options.userId === SHARED ? EFOREIGN : EOWN;
    assert.equal(await h.actions.getDocumentFromId(target), null);
    noEffects(h);
  });
}

test('experiment read returns null for unknown and malformed IDs', async () => {
  for (const id of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24), '', null]) {
    const h = setup();
    assert.equal(await h.actions.getDocumentFromId(id), null);
    noEffects(h);
  }
});

const mutations = [
  ['deleteDocumentById', []], ['updateExperimentNameById', ['Renamed']],
  ['updateExperimentTagsById', [['one', 'two']]], ['updateExperimentArchiveStatusById', ['ARCHIVED']],
  ['addShareLink', []],
];
for (const [name, args] of mutations) {
  test(`${name} permits the owner and selects the requested experiment`, async () => {
    const h = setup();
    const result = await h.actions[name](EOWN, ...args);
    const owned = h.documents.experiments.find((document) => String(document._id) === EOWN);
    assert.equal(h.documents.experiments.find((document) => String(document._id) === EFOREIGN).name, 'Foreign');
    if (name === 'deleteDocumentById') {
      assert.equal(owned, undefined);
      assert.deepEqual(h.calls.bucketDeletes.map(({ bucket, id }) => `${bucket}:${id}`).sort(), ['logsBucket', 'resultsBucket', 'zipsBucket'].map((bucket) => `${bucket}:${FOWN}`).sort());
      for (const bucket of ['logsBucket', 'resultsBucket', 'zipsBucket']) assert.deepEqual(ids(h.documents[`${bucket}.files`]), [FFOREIGN]);
    } else if (name === 'addShareLink') {
      assert.equal(typeof result, 'string');
      assert.ok(result.length > 0);
      assert.equal(h.calls.writes[0].document.experimentId, EOWN);
    } else {
      const field = name === 'updateExperimentNameById' ? 'name' : name === 'updateExperimentTagsById' ? 'tags' : 'status';
      assert.deepEqual(owned[field], args[0]);
      assert.equal(h.calls.writes.length, 1);
    }
    assert.equal(h.calls.backend.length, 0);
  });

  test(`${name} refuses shared, foreign, and admin users before mutations`, async () => {
    for (const options of [{ userId: SHARED }, { userId: FOREIGN }, { userId: ADMIN }, { session: null }, { session: { user: {} } }, { users: [] }]) {
      const h = setup(options);
      await refused(h, () => h.actions[name](EOWN, ...args));
    }
  });

  test(`${name} refuses unknown and invalid experiment IDs before mutations`, async () => {
    for (const id of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24), null]) {
      const h = setup();
      await refused(h, () => h.actions[name](id, ...args));
    }
  });
}

test('cancel permits owner and current database admin while preserving backend mechanics', async () => {
  for (const userId of [OWNER, ADMIN]) {
    const h = setup({ userId, sessionRole: 'user', backendPort: '6060' });
    assert.equal((await h.actions.cancelExperimentById(EOWN)).ok, true);
    assert.equal(h.calls.backend.length, 1);
    const { url, init } = h.calls.backend[0];
    assert.equal(url, 'http://glados-service-backend:6060/cancelExperiment');
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).get('content-type'), 'application/json');
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer service-token');
    assert.deepEqual(JSON.parse(init.body), { jobName: `runner-${EOWN}` });
    const experiment = h.documents.experiments.find((document) => String(document._id) === EOWN);
    assert.equal(experiment.finished, true);
    assert.equal(experiment.status, 'CANCELLED');
    assert.equal(h.documents.experiments[0].status, undefined);
  }
});

test('cancel rejects backend refusal without changing experiment state', async () => {
  const h = setup({ backendStatus: 503 });
  const result = await h.actions.cancelExperimentById(EOWN);
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Failed to cancel experiment');
  assert.equal(h.calls.backend.length, 1);
  assert.equal(h.calls.writes.length, 0);
  assert.equal(h.documents.experiments.find((document) => String(document._id) === EOWN).status, 'RUNNING');
});

test('uppercase experiment IDs cancel the canonical Kubernetes Job', async () => {
  const h = setup();
  assert.equal((await h.actions.cancelExperimentById(EOWN.toUpperCase())).ok, true);
  assert.deepEqual(JSON.parse(h.calls.backend[0].init.body), { jobName: `runner-${EOWN}` });
  assert.equal(h.documents.experiments.find((document) => String(document._id) === EOWN).status, 'CANCELLED');
});

test('privileged users do not inherit admin cancellation rights', async () => {
  for (const userId of [SHARED, FOREIGN]) {
    const h = setup({ userId, users: [{ _id: oid(userId), role: 'privileged' }] });
    await refusedCancel(h, () => h.actions.cancelExperimentById(EOWN));
  }
});

test('cancel denies shared readers, stale session admins, unknown IDs, and missing identities before backend calls', async () => {
  for (const options of [{ userId: SHARED }, { userId: FOREIGN, sessionRole: 'admin' }, { session: null }, { session: { user: {} } }, { users: [] }]) {
    const h = setup(options);
    await refusedCancel(h, () => h.actions.cancelExperimentById(EOWN));
  }
  for (const id of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24), null]) {
    const h = setup({ userId: ADMIN });
    await refusedCancel(h, () => h.actions.cancelExperimentById(id));
  }
});

test('recent files ignore the caller owner and return only the session user files', async () => {
  const h = setup();
  const files = await h.actions.getRecentFiles(FOREIGN);
  assert.deepEqual(ids(files), [FOWN]);
  assert.equal(files[0].metadata.userId, OWNER);
  assert.equal(files[0].uploadDate, '2026-01-01T00:00:00.000Z');
  noEffects(h);
});

test('recent files require a current authenticated identity', async () => {
  for (const options of [{ session: null }, { session: { user: {} } }, { users: [] }]) {
    const h = setup(options);
    await refused(h, () => h.actions.getRecentFiles(FOREIGN));
  }
});

for (const name of ['downloadFile', 'copyFile']) {
  test(`${name} preserves shared source access for uppercase ID inputs`, async () => {
    for (const [storedId, suppliedId] of [
      [FSHARED, FSHARED.toUpperCase()], [FSHARED.toUpperCase(), FSHARED],
      [FSHARED.replace('f', 'F'), FSHARED.toUpperCase()],
    ]) {
      const h = setup({ userId: SHARED });
      h.documents.experiments.find((document) => String(document._id) === ESHARED).file = storedId;
      const result = await h.actions[name](suppliedId, SHARED);
      assert.ok(result);
      assert.equal(h.calls.downloads.length, 1);
      if (name === 'copyFile') assert.equal(h.calls.uploads[0].settings.metadata.userId, SHARED);
    }
  });
  test(`${name} permits an owned source and an actual shared experiment source`, async () => {
    for (const [userId, fileId] of [[OWNER, FOWN], [SHARED, FSHARED]]) {
      const h = setup({ userId });
      const before = JSON.stringify(h.documents['fileBucket.files']);
      const result = await h.actions[name](fileId, OWNER);
      if (name === 'downloadFile' || userId === SHARED) {
        assert.deepEqual(h.calls.downloads, [{ bucket: 'fileBucket', id: fileId }]);
      }
      if (name === 'downloadFile') {
        assert.equal(result, `data:application/zip;base64,${Buffer.from('fixture-contents').toString('base64')}`);
        assert.equal(h.calls.uploads.length, 0);
      } else if (userId === SHARED) {
        assert.equal(result, FNEW);
        assert.equal(h.calls.uploads.length, 1);
        assert.equal(h.calls.uploads[0].settings.metadata.userId, SHARED);
        assert.equal(Buffer.concat(h.calls.uploads[0].chunks).toString(), 'fixture-contents');
      } else {
        assert.equal(result, FOWN);
        assert.equal(h.calls.downloads.length, 0);
        assert.equal(h.calls.uploads.length, 0);
      }
      assert.equal(JSON.stringify(h.documents['fileBucket.files']), before, 'Reading or copying must not mutate original metadata');
    }
  });

  test(`${name} denies unrelated foreign files, forged experiment references, admin overrides, and anonymous callers`, async () => {
    for (const [options, fileId] of [
      [{ userId: SHARED }, FFOREIGN], [{ userId: OWNER }, FSHARED],
      [{ userId: ADMIN }, FOWN], [{ userId: FOREIGN }, FOWN],
      [{ session: null }, FOWN], [{ session: { user: {} } }, FOWN], [{ users: [] }, FOWN],
    ]) {
      const h = setup(options);
      await refused(h, () => h.actions[name](fileId, OWNER));
    }
  });

  test(`${name} rejects unknown and invalid source IDs without content reads or uploads`, async () => {
    for (const id of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24), null]) {
      const h = setup();
      await refused(h, () => h.actions[name](id, OWNER));
    }
  });
}

test('copy reuses only the session destination hash after authorizing its source', async () => {
  const h = setup({ userId: SHARED });
  h.documents['fileBucket.files'].find((document) => String(document._id) === FDECOY).metadata.hash = 'shared-hash';
  const before = JSON.stringify(h.documents['fileBucket.files']);
  assert.equal(await h.actions.copyFile(FSHARED, OWNER), FDECOY);
  assert.equal(h.calls.downloads.length, 0);
  assert.equal(h.calls.uploads.length, 0);
  assert.equal(JSON.stringify(h.documents['fileBucket.files']), before);
});

test('copy does not let destination hash reuse bypass source authorization', async () => {
  const h = setup({ userId: SHARED });
  h.documents['fileBucket.files'].find((document) => String(document._id) === FDECOY).metadata.hash = 'foreign-hash';
  h.initial = JSON.stringify(h.documents);
  await refused(h, () => h.actions.copyFile(FFOREIGN, SHARED));
});

for (const name of ['refreshFileTimestamp', 'updateLastUsedDateFile']) {
  test(`${name} updates only the owner's requested file`, async () => {
    const h = setup();
    await h.actions[name](FOWN);
    assert.equal(h.calls.writes.length, 1);
    assert.equal(String(h.calls.writes[0].query._id), FOWN);
    const file = h.documents['fileBucket.files'].find((document) => String(document._id) === FOWN);
    assert.ok(+file.metadata.lastUsedDate > +new Date('2026-01-02'));
    assert.equal(+h.documents['fileBucket.files'][0].metadata.lastUsedDate, +new Date('2026-01-02'));
  });

  test(`${name} denies shared readers, foreign users, admins, and missing identities`, async () => {
    for (const [options, id] of [[{ userId: SHARED }, FSHARED], [{ userId: FOREIGN }, FOWN], [{ userId: ADMIN }, FOWN], [{ session: null }, FOWN], [{ session: { user: {} } }, FOWN], [{ users: [] }, FOWN]]) {
      const h = setup(options);
      await refused(h, () => h.actions[name](id));
    }
  });

  test(`${name} refuses unknown and invalid IDs without timestamp writes`, async () => {
    for (const id of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24), null]) {
      const h = setup();
      await refused(h, () => h.actions[name](id));
    }
  });
}

test('share redemption adds only the authenticated user to the linked experiment', async () => {
  const h = setup({ userId: FOREIGN });
  await h.actions.redeemShareLink(VALID_LINK, FOREIGN);
  assert.equal(h.calls.writes.length, 1);
  assert.deepEqual(h.documents.experiments.find((document) => String(document._id) === EOWN).sharedUsers, [SHARED, FOREIGN]);
  assert.deepEqual(h.documents.experiments.find((document) => String(document._id) === EFOREIGN).sharedUsers, []);
});

test('share redemption rejects forged identities, missing sessions, invalid links, and absent experiments before writes', async () => {
  for (const [options, userId] of [[{ userId: FOREIGN }, ADMIN], [{ session: null }, FOREIGN], [{ session: { user: {} } }, FOREIGN], [{ users: [] }, OWNER]]) {
    const h = setup(options);
    await refused(h, () => h.actions.redeemShareLink(VALID_LINK, userId));
  }
  for (const link of ['unknown-link', '', null]) {
    const h = setup({ userId: FOREIGN });
    await refused(h, () => h.actions.redeemShareLink(link, FOREIGN));
  }
  for (const experimentId of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24)]) {
    const h = setup({ userId: FOREIGN, shareLinks: [{ _id: oid(LINK_ID), link: VALID_LINK, experimentId, expiration: new Date('2099-01-01') }] });
    await refused(h, () => h.actions.redeemShareLink(VALID_LINK, FOREIGN));
  }
});

test('unfollow removes only the authenticated shared user from the requested experiment', async () => {
  const h = setup({ userId: SHARED });
  await h.actions.unfollowExperiment(EOWN, SHARED);
  assert.equal(h.calls.writes.length, 1);
  assert.deepEqual(h.documents.experiments.find((document) => String(document._id) === EOWN).sharedUsers, []);
  assert.deepEqual(h.documents.experiments.find((document) => String(document._id) === ESHARED).sharedUsers, [SHARED]);
});

test('unfollow rejects forged identities, nonmembers, missing sessions, and invalid experiment IDs without writes', async () => {
  for (const [options, userId] of [[{ userId: FOREIGN }, SHARED], [{ userId: ADMIN }, SHARED], [{ userId: FOREIGN }, FOREIGN], [{ session: null }, SHARED], [{ session: { user: {} } }, SHARED], [{ users: [] }, OWNER]]) {
    const h = setup(options);
    await refused(h, () => h.actions.unfollowExperiment(EOWN, userId));
  }
  for (const id of [UNKNOWN, 'invalid', 'abcdefghijkl', 'g'.repeat(24), null]) {
    const h = setup({ userId: SHARED });
    await refused(h, () => h.actions.unfollowExperiment(id, SHARED));
  }
});

test('CLI result and project download helpers are not exported as Server Actions', () => {
  const { actions } = setup();
  assert.equal(actions.fetchResultsFileCLI, undefined);
  assert.equal(actions.fetchProjectZipCLI, undefined);
});

test('malformed historical sharing is not a read, copy, or membership grant', async () => {
  for (const sharedUsers of [SHARED, `prefix${SHARED}suffix`, 7, {}, null]) {
    const options = { userId: SHARED, experiments: [{
      _id: oid(EOWN), creator: OWNER, file: FOWN, name: 'Owned', sharedUsers,
    }] };
    const h = setup(options);
    assert.equal(await h.actions.getDocumentFromId(EOWN), null);
    await refused(h, () => h.actions.downloadFile(FOWN));
    await refused(h, () => h.actions.copyFile(FOWN, SHARED));
    await refused(h, () => h.actions.unfollowExperiment(EOWN, SHARED));
    await assert.rejects(h.actions.redeemShareLink(VALID_LINK, SHARED),
      error => error === 'Invalid sharing metadata');
    noEffects(h);
  }
});
