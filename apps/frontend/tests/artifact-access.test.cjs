const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { loadSource, frontendRequire } = require('../app/api/cli/tests/helpers.cjs');

const mongodb = frontendRequire('mongodb');
const OWNER = '507f1f77bcf86cd799439011';
const SHARED = '507f1f77bcf86cd799439012';
const FOREIGN = '507f1f77bcf86cd799439013';
const EID = '507f1f77bcf86cd799439014';
const OTHER_EID = '507f1f77bcf86cd799439015';
const FILE_ID = '507f1f77bcf86cd799439016';
const OTHER_FILE_ID = '507f1f77bcf86cd799439017';
const oid = (id) => new mongodb.ObjectId(id);

function equal(actual, expected) {
  if (actual instanceof mongodb.ObjectId || expected instanceof mongodb.ObjectId) {
    return actual instanceof mongodb.ObjectId && expected instanceof mongodb.ObjectId && actual.equals(expected);
  }
  return actual != null && actual === expected;
}

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((condition) => matches(document, condition));
    if (key === '$and') return expected.every((condition) => matches(document, condition));
    const actual = key.split('.').reduce((value, part) => value?.[part], document);
    if (expected && typeof expected === 'object' && '$in' in expected) {
      if (expected.$type === 'array' && !Array.isArray(actual)) return false;
      const values = Array.isArray(actual) ? actual : [actual];
      return expected.$in.some((value) => values.some((entry) => equal(entry, value)));
    }
    return Array.isArray(actual) ? actual.some((entry) => equal(entry, expected)) : equal(actual, expected);
  });
}

function setup(options = {}) {
  const calls = { queries: [], files: [], reads: [] };
  const session = Object.hasOwn(options, 'session') ? options.session : { user: { id: options.userId ?? OWNER } };
  const experiment = {
    _id: oid(EID), creator: OWNER, sharedUsers: [SHARED],
    name: 'Owned artifact', created: 1700000000000,
  };
  const documents = options.missing ? [] : [
    { ...experiment, _id: oid(OTHER_EID) }, experiment,
  ];
  const db = { collection: () => ({
    findOne: async (query) => {
      calls.queries.push(query);
      return documents.find((document) => matches(document, query)) ?? null;
    },
  }) };
  const database = {
    __esModule: true, default: Promise.resolve({ db: () => db }),
    DB_NAME: 'test-db', COLLECTION_EXPERIMENTS: 'experiments',
  };
  class GridFSBucket {
    constructor(_db, settings) { this.name = settings.bucketName; }
    find(query) {
      calls.files.push({ bucket: this.name, query });
      const files = [
        { _id: oid(OTHER_FILE_ID), metadata: { experimentId: OTHER_EID } },
        { _id: oid(FILE_ID), metadata: { experimentId: EID } },
      ].filter((file) => matches(file, query));
      return { toArray: async () => files };
    }
    openDownloadStream(id) {
      calls.reads.push({ bucket: this.name, id: String(id) });
      return Readable.from([Buffer.from(options.empty ? '' : String(id) !== FILE_ID ? 'other artifact bytes' : this.name === 'resultsBucket'
        ? 'trial,result\n1,pass\n' : this.name === 'zipsBucket' ? 'PK\u0003\u0004zip bytes' : 'private logs\n')]);
    }
  }
  const auth = { auth: async () => session };
  const logRoute = loadSource('app/api/download/logs/[idOfLogFile]/route.ts', {
    '../../../../../lib/mongodb': database,
    '../../../../../auth': auth,
    mongodb: { ...mongodb, GridFSBucket },
  });
  const actions = loadSource('lib/mongodb_funcs.ts', {
    './mongodb': database, '../auth': auth, mongodb: { ...mongodb, GridFSBucket },
  });
  return {
    calls, experiment, actions,
    getLogs: (id = EID) => logRoute.GET(new Request('http://localhost/api/download/logs/test'), {
      params: Promise.resolve({ idOfLogFile: id }),
    }),
  };
}

for (const session of [null, {}, { user: {} }]) {
  test(`Web logs reject an unauthenticated identity ${JSON.stringify(session)} before data access`, async () => {
    const h = setup({ session });
    const response = await h.getLogs();
    assert.equal(response.status, 401);
    assert.equal(h.calls.queries.length, 0);
    assert.equal(h.calls.files.length, 0);
    assert.equal(h.calls.reads.length, 0);
  });
}

test('non-array sharing never grants Web artifact access', async () => {
  for (const sharedUsers of [SHARED, `prefix${SHARED}suffix`, 7, {}, null]) {
    for (const name of ['fetchResultsFile', 'fetchProjectZip', 'getLogs']) {
      const h = setup({ userId: SHARED });
      h.experiment.sharedUsers = sharedUsers;
      if (name === 'getLogs') assert.equal((await h.getLogs()).status, 404);
      else assert.equal(await h.actions[name](EID), null);
      assert.equal(h.calls.files.length, 0);
      assert.equal(h.calls.reads.length, 0);
    }
  }
});

test('Web logs return the same denial for private and nonexistent experiments', async () => {
  const foreign = setup({ userId: FOREIGN });
  const missing = setup({ missing: true });
  const denied = await foreign.getLogs();
  const absent = await missing.getLogs();
  assert.equal(denied.status, 404);
  assert.equal(absent.status, denied.status);
  assert.equal(await absent.text(), await denied.text());
  assert.equal(foreign.calls.queries.length, 1);
  assert.equal(matches(foreign.experiment, foreign.calls.queries[0]), false, 'Experiment lookup must include caller access');
  for (const h of [foreign, missing]) {
    assert.equal(h.calls.files.length, 0);
    assert.equal(h.calls.reads.length, 0);
  }
});

for (const invalid of ['', 'invalid-id', '507f1f77bcf86cd79943901', null, { $ne: null }]) {
  test(`Web logs reject malformed experiment ID ${JSON.stringify(invalid)} before data access`, async () => {
    const h = setup();
    const response = await h.getLogs(invalid);
    assert.equal(response.status, 400);
    assert.equal(h.calls.queries.length, 0);
    assert.equal(h.calls.files.length, 0);
  });
}

for (const userId of [OWNER, SHARED]) {
  for (const id of [EID, EID.toUpperCase()]) {
    test(`Web logs preserve exact contents for ${userId} using ${id}`, async () => {
      const h = setup({ userId });
      const response = await h.getLogs(id);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
      assert.equal(await response.text(), 'private logs\n');
      assert.equal(String(h.calls.queries[0]._id), EID);
      assert.equal(h.calls.files[0].query['metadata.experimentId'], EID);
      assert.deepEqual(h.calls.reads, [{ bucket: 'logsBucket', id: FILE_ID }]);
    });
  }
}

test('Web logs preserve the successful empty-log response', async () => {
  const h = setup({ empty: true });
  const response = await h.getLogs();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), `Experiment Log '${EID}' was empty.`);
});

for (const [name, bucket] of [['fetchResultsFile', 'resultsBucket'], ['fetchProjectZip', 'zipsBucket']]) {
  for (const id of ['invalid-id', '', null]) {
    test(`${name} rejects malformed experiment ID ${JSON.stringify(id)} without data access`, async () => {
      const h = setup();
      assert.equal(await h.actions[name](id), null);
      assert.equal(h.calls.queries.length, 0);
      assert.equal(h.calls.files.length, 0);
      assert.equal(h.calls.reads.length, 0);
    });
  }

  for (const session of [null, {}, { user: {} }]) {
    test(`${name} rejects an unauthenticated identity ${JSON.stringify(session)} without data access`, async () => {
      const h = setup({ session });
      assert.equal(await h.actions[name](EID), null);
      assert.equal(h.calls.queries.length, 0);
      assert.equal(h.calls.files.length, 0);
      assert.equal(h.calls.reads.length, 0);
    });
  }

  for (const userId of [OWNER, SHARED]) {
    for (const id of [EID, EID.toUpperCase()]) {
      test(`${name} returns the exact artifact for ${userId} using ${id}`, async () => {
        const h = setup({ userId });
        const result = await h.actions[name](id);
        assert.ok(result);
        if (name === 'fetchResultsFile') {
          assert.equal(result.contents, 'trial,result\n1,pass\n');
          assert.match(result.name, /^Owned_artifact_.*\.csv$/);
        } else {
          assert.deepEqual(Buffer.from(result.contents, 'base64'), Buffer.from('PK\u0003\u0004zip bytes'));
          assert.match(result.name, /^Owned_artifact_.*\.zip$/);
        }
        assert.equal(h.calls.files[0].query['metadata.experimentId'], EID);
        assert.deepEqual(h.calls.reads, [{ bucket, id: FILE_ID }]);
      });
    }
  }

  test(`${name} denies foreign experiments before artifact lookup`, async () => {
    const h = setup({ userId: FOREIGN });
    assert.equal(await h.actions[name](EID), null);
    assert.equal(h.calls.files.length, 0);
    assert.equal(h.calls.reads.length, 0);
  });
}
