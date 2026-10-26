const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { loadSource, frontendRequire } = require('./helpers.cjs');

const mongodb = frontendRequire('mongodb');
const OWNER = '507f1f77bcf86cd799439011';
const SHARED = '507f1f77bcf86cd799439012';
const STRANGER = '507f1f77bcf86cd799439013';
const EID = '507f1f77bcf86cd799439014';
const FILE_ID = '507f1f77bcf86cd799439015';
const ROUTES = [
  'status', 'queryExp', 'tokenAuth', 'submitExp', 'uploadFile',
  'downloadResult', 'downloadLogs', 'downloadZip',
];
const JSON_ROUTES = ROUTES.filter((route) => !['submitExp', 'uploadFile'].includes(route));
const ID_ROUTES = ['status', 'downloadResult', 'downloadLogs', 'downloadZip'];

function experiment(overrides = {}) {
  return {
    _id: new mongodb.ObjectId(EID), creator: OWNER, sharedUsers: [SHARED],
    name: 'Private experiment', status: 'COMPLETED', passes: 7, fails: 2,
    totalExperimentRuns: 12, startedAtEpochMillis: 123456,
    ...overrides,
  };
}

function sameValue(left, right) {
  return left !== undefined && right !== undefined && String(left) === String(right);
}

// Evaluate the route's real query so an accidentally omitted access predicate fails.
function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$and') return value.every((part) => matches(document, part));
    if (key === '$or') return value.some((part) => matches(document, part));
    if (value && typeof value === 'object' && '$in' in value) {
      const values = Array.isArray(document[key]) ? document[key] : [document[key]];
      return value.$in.some((item) => values.some((entry) => sameValue(entry, item)));
    }
    return sameValue(document[key], value);
  });
}

function jsonRequest(body) {
  return new Request('http://localhost/api/cli/test', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validBody(route) {
  if (route === 'status') return { token: 'valid-token', eid: EID };
  if (route === 'queryExp') return { token: 'valid-token', exp_title: '*' };
  if (route === 'tokenAuth') return { token: 'valid-token' };
  return { token: 'valid-token', expID: EID };
}

function multipartRequest(options = {}) {
  const form = new FormData();
  if (options.token !== null) form.set('userToken', options.token ?? 'valid-token');
  if (options.file !== null) {
    form.set('file', new Blob([options.yaml ?? 'name: CLI experiment\n']), 'experiment.yaml');
  }
  if (options.fileId !== null) form.set('execFileID', options.fileId ?? FILE_ID);
  return new Request('http://localhost/api/cli/test', { method: 'POST', body: form });
}

function harness(route, options = {}) {
  const calls = {
    auth: [], db: [], queries: [], files: [], reads: [], writes: [], helpers: [], errors: [],
  };
  const documents = options.documents ?? [experiment()];
  const identity = options.identity ?? OWNER;
  const authBody = Object.hasOwn(options, 'authBody')
    ? options.authBody : { _id: identity, email: 'owner@example.test', role: 'user' };
  const auth = {
    tokenBasedAuth: async (token) => {
      calls.auth.push(token);
      if (options.authResponse) return options.authResponse(token);
      return Response.json(authBody, { status: options.authStatus ?? 200 });
    },
  };
  const collection = {
    findOne: async (query) => {
      calls.queries.push(query);
      if (options.dataError) throw options.dataError;
      return documents.find((document) => matches(document, query)) ?? null;
    },
    find: (query) => {
      calls.queries.push(query);
      if (options.dataError) throw options.dataError;
      return { toArray: async () => documents.filter((document) => matches(document, query)) };
    },
  };
  const db = { collection: () => collection };
  const client = {
    db: (name) => { calls.db.push(name); return db; },
  };
  class GridFSBucket {
    constructor(_db, bucketOptions) { this.name = bucketOptions.bucketName; }
    find(query) {
      calls.files.push({ bucket: this.name, query });
      if (options.dataError) throw options.dataError;
      const files = this.name === 'fileBucket'
        ? (options.reusedFiles ?? [])
        : [{ _id: new mongodb.ObjectId(FILE_ID) }];
      return { toArray: async () => files };
    }
    openDownloadStream(id) {
      calls.reads.push(id);
      return Readable.from([Buffer.from('private logs\n')]);
    }
    openUploadStream(filename, uploadOptions) {
      calls.writes.push({ filename, options: uploadOptions });
      const stream = new EventEmitter();
      stream.id = new mongodb.ObjectId(FILE_ID);
      stream.filename = filename;
      return stream;
    }
  }
  const accessible = (eid, uid) => documents.find((document) => (
    sameValue(document._id, eid)
    && (sameValue(document.creator, uid) || document.sharedUsers?.some((user) => sameValue(user, uid)))
  ));
  const helpers = {
    submitExperimentCLI: async (...args) => {
      calls.helpers.push({ name: 'submitExperimentCLI', args });
      if (options.dataError) throw options.dataError;
      return EID;
    },
    fetchResultsFileCLI: async (eid, uid) => {
      calls.helpers.push({ name: 'fetchResultsFileCLI', args: [eid, uid] });
      if (options.dataError) throw options.dataError;
      return accessible(eid, uid)
        ? { contents: 'trial,result\n1,pass\n', name: 'experiment.csv' }
        : { success: false, status: 'not_found' };
    },
    fetchProjectZipCLI: async (eid, uid) => {
      calls.helpers.push({ name: 'fetchProjectZipCLI', args: [eid, uid] });
      if (options.dataError) throw options.dataError;
      return accessible(eid, uid)
        ? { contents: Buffer.from('PK\u0003\u0004zip bytes').toString('base64'), name: 'experiment' }
        : null;
    },
  };
  const formidable = () => ({
    parse: (_incoming, callback) => callback(
      options.parseError ?? null,
      options.uploadFields ?? { userToken: ['valid-token'] },
      options.uploadFiles ?? {
        file: [{ filepath: '/mock/upload', originalFilename: 'program.py', hash: 'sha256-hash' }],
      },
    ),
  });
  const fs = {
    createReadStream: (filepath) => {
      calls.reads.push(filepath);
      return { pipe: (destination) => {
        queueMicrotask(() => destination.emit('finish'));
        return destination;
      } };
    },
  };
  const loadedRoute = loadSource(`app/api/cli/${route}/route.ts`, {
    '../../../../tokenAuth': auth,
    '../../../../lib/mongodb': {
      __esModule: true, default: Promise.resolve(client),
      DB_NAME: 'test-db', COLLECTION_EXPERIMENTS: 'experiments',
    },
    '../../../../lib/mongodb_funcs': helpers,
    mongodb: { ...mongodb, GridFSBucket },
    formidable,
    stream: { Readable },
    fs,
  }, { console: { ...console, error: (...args) => calls.errors.push(args) } });
  return { post: loadedRoute.POST, calls };
}

function requestFor(route, body) {
  return ['submitExp', 'uploadFile'].includes(route) ? multipartRequest() : jsonRequest(body ?? validBody(route));
}

function assertNoDataAccess(calls) {
  assert.equal(calls.db.length, 0, 'unauthenticated request accessed the database');
  assert.equal(calls.queries.length, 0, 'unauthenticated request queried experiments');
  assert.equal(calls.files.length, 0, 'unauthenticated request queried stored files');
  assert.equal(calls.reads.length, 0, 'unauthenticated request read a file');
  assert.equal(calls.writes.length, 0, 'unauthenticated request wrote a file');
  assert.equal(calls.helpers.length, 0, 'unauthenticated request called a data helper');
}

for (const route of ROUTES) {
  for (const authCase of [
    { label: 'HTTP 401', authStatus: 401, authBody: { response: 'Missing User' } },
    { label: 'legacy HTTP 404', authStatus: 404, authBody: { response: 'Missing User' } },
    { label: 'a successful response without an identity', authBody: { email: 'nobody@example.test' } },
    { label: 'HTTP 401 despite an identity in the body', authStatus: 401, authBody: { _id: OWNER } },
  ]) {
    test(`${route}: ${authCase.label} returns HTTP 401 before data access`, async () => {
      const { post, calls } = harness(route, authCase);
      const response = await post(requestFor(route));
      assert.equal(response.status, 401);
      assert.equal(calls.auth.length, 1);
      assertNoDataAccess(calls);
    });
  }
}

for (const route of JSON_ROUTES) {
  test(`${route}: missing arguments return HTTP 400 before authentication`, async () => {
    const { post, calls } = harness(route);
    const response = await post(jsonRequest({}));
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assertNoDataAccess(calls);
  });

  test(`${route}: malformed JSON returns HTTP 400`, async () => {
    const { post, calls } = harness(route);
    const request = new Request('http://localhost/api/cli/test', { method: 'POST', body: '{' });
    const response = await post(request);
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assertNoDataAccess(calls);
  });

  test(`${route}: non-string tokens return HTTP 400`, async () => {
    const { post, calls } = harness(route);
    const response = await post(jsonRequest({ ...validBody(route), token: { unsafe: 'token' } }));
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assertNoDataAccess(calls);
  });

  for (const [argument] of Object.entries(validBody(route))) {
    test(`${route}: missing ${argument} returns HTTP 400`, async () => {
      const { post, calls } = harness(route);
      const body = validBody(route);
      delete body[argument];
      const response = await post(jsonRequest(body));
      assert.equal(response.status, 400);
      assert.equal(calls.auth.length, 0);
      assertNoDataAccess(calls);
    });
  }
}

for (const route of ID_ROUTES) {
  test(`${route}: malformed experiment IDs return HTTP 400 without data access`, async () => {
    const { post, calls } = harness(route);
    const key = route === 'status' ? 'eid' : 'expID';
    const response = await post(jsonRequest({ ...validBody(route), [key]: 'not-an-object-id' }));
    assert.equal(response.status, 400);
    assertNoDataAccess(calls);
  });
}

test('status: authenticated identity is awaited and status fields are preserved', async () => {
  const { post, calls } = harness('status');
  const response = await post(jsonRequest(validBody('status')));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true, status: 'COMPLETED', current_permutation: 9, total_permutations: 12,
  });
  assert.equal(calls.queries.length, 1);
});

test('status: absent pass/fail counts retain the zero default', async () => {
  const { post } = harness('status', { documents: [experiment({ passes: undefined, fails: undefined })] });
  assert.equal((await (await post(jsonRequest(validBody('status')))).json()).current_permutation, 0);
});

for (const route of ['status', 'queryExp', 'downloadResult', 'downloadLogs', 'downloadZip']) {
  test(`${route}: a valid stranger cannot see a private experiment`, async () => {
    const { post, calls } = harness(route, { identity: STRANGER });
    const response = await post(jsonRequest(validBody(route)));
    const body = await response.text();
    if (route === 'queryExp') {
      assert.deepEqual(JSON.parse(body), { success: true, matches: [] });
    } else {
      assert.match(body, /not[_ ]found/i);
      if (route !== 'status') assert.equal(response.status, 404);
    }
    assert.doesNotMatch(body, /Private experiment|private logs|trial,result|zip bytes/);
    assert.equal(calls.reads.length, 0);
  });

  test(`${route}: shared users retain access with their authenticated identity`, async () => {
    const { post, calls } = harness(route, { identity: SHARED });
    const response = await post(jsonRequest(validBody(route)));
    assert.equal(response.status, 200);
    if (route === 'status') assert.equal((await response.json()).success, true);
    if (route === 'queryExp') assert.equal((await response.json()).matches[0].id, EID);
    if (route === 'downloadResult') {
      assert.equal(await response.text(), 'trial,result\n1,pass\n');
      assert.deepEqual(calls.helpers[0].args, [EID, SHARED]);
    }
    if (route === 'downloadLogs') assert.equal(await response.text(), 'private logs\n');
    if (route === 'downloadZip') {
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from('PK\u0003\u0004zip bytes'));
      assert.deepEqual(calls.helpers[0].args, [EID, SHARED]);
    }
  });
}

test('queryExp: named queries preserve visibility filtering and descending start order', async () => {
  const visible = experiment({ name: 'matching', startedAtEpochMillis: 10 });
  const recent = experiment({ _id: new mongodb.ObjectId(FILE_ID), name: 'matching', startedAtEpochMillis: 20 });
  const privateMatch = experiment({ creator: STRANGER, sharedUsers: [], name: 'matching' });
  const wrongName = experiment({ name: 'different' });
  const { post } = harness('queryExp', { documents: [visible, recent, privateMatch, wrongName] });
  const response = await post(jsonRequest({ token: 'valid-token', exp_title: 'matching' }));
  const body = await response.json();
  assert.deepEqual(body.matches.map((match) => match.id), [FILE_ID, EID]);
  assert.equal(body.matches[0].current_permutation, 9);
});

test('queryExp: non-string titles return HTTP 400', async () => {
  const { post, calls } = harness('queryExp');
  const response = await post(jsonRequest({ token: 'valid-token', exp_title: ['*'] }));
  assert.equal(response.status, 400);
  assertNoDataAccess(calls);
});

test('tokenAuth: a valid identity remains a JSON response', async () => {
  const { post } = harness('tokenAuth');
  const response = await post(jsonRequest({ token: 'valid-token' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json())._id, OWNER);
});

for (const route of ['downloadResult', 'downloadLogs', 'downloadZip']) {
  test(`${route}: valid requests preserve raw download responses`, async () => {
    const { post } = harness(route);
    const response = await post(jsonRequest(validBody(route)));
    assert.equal(response.status, 200);
    if (route === 'downloadResult') {
      assert.match(response.headers.get('content-type'), /^text\/csv/);
      assert.match(response.headers.get('content-disposition'), /experiment\.csv/);
      assert.equal(await response.text(), 'trial,result\n1,pass\n');
    } else if (route === 'downloadLogs') {
      assert.match(response.headers.get('content-type'), /^text\/plain/);
      assert.equal(await response.text(), 'private logs\n');
    } else {
      assert.equal(response.headers.get('content-type'), 'application/zip');
      assert.match(response.headers.get('content-disposition'), /experiment\.zip/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from('PK\u0003\u0004zip bytes'));
    }
  });
}

for (const omitted of ['token', 'file', 'fileId']) {
  test(`submitExp: missing ${omitted} returns HTTP 400 without submission`, async () => {
    const { post, calls } = harness('submitExp');
    const response = await post(multipartRequest({ [omitted]: null }));
    assert.equal(response.status, 400);
    assertNoDataAccess(calls);
  });
}

test('submitExp: malformed multipart input returns HTTP 400', async () => {
  const { post, calls } = harness('submitExp');
  const response = await post(jsonRequest({}));
  assert.equal(response.status, 400);
  assertNoDataAccess(calls);
});

test('submitExp: valid YAML submission uses authenticated identity and returns expId', async () => {
  const { post, calls } = harness('submitExp');
  const response = await post(multipartRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, expId: EID });
  const submission = calls.helpers[0];
  assert.equal(submission.name, 'submitExperimentCLI');
  assert.equal(submission.args[0].name, 'CLI experiment');
  assert.equal(submission.args[0].file, FILE_ID);
  assert.equal(submission.args[0].status, 'CREATED');
  assert.deepEqual(submission.args.slice(1), [OWNER, 'owner@example.test', 'user', FILE_ID]);
});

test('submitExp: invalid YAML returns HTTP 400 before submission', async () => {
  const { post, calls } = harness('submitExp');
  const response = await post(multipartRequest({ yaml: 'name: [unterminated' }));
  assert.equal(response.status, 400);
  assertNoDataAccess(calls);
});

for (const missing of ['token', 'file']) {
  test(`uploadFile: missing ${missing} returns HTTP 400`, async () => {
    const { post, calls } = harness('uploadFile', missing === 'token' ? { uploadFields: {} } : { uploadFiles: {} });
    const response = await post(multipartRequest());
    assert.equal(response.status, 400);
    assertNoDataAccess(calls);
  });
}

test('uploadFile: malformed multipart input returns HTTP 400', async () => {
  const { post, calls } = harness('uploadFile', { parseError: new Error('bad multipart') });
  const response = await post(multipartRequest());
  assert.equal(response.status, 400);
  assertNoDataAccess(calls);
});

test('uploadFile: valid upload records authenticated ownership and returns fileId', async () => {
  const { post, calls } = harness('uploadFile');
  const response = await post(multipartRequest());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.fileId, FILE_ID);
  assert.equal(body.reuse, false);
  assert.equal(calls.writes[0].options.metadata.userId, OWNER);
  assert.equal(calls.files[0].query['metadata.userId'], OWNER);
});

test('uploadFile: existing files are reused only within authenticated ownership', async () => {
  const { post, calls } = harness('uploadFile', {
    reusedFiles: [{ _id: new mongodb.ObjectId(FILE_ID), filename: 'program.py' }],
  });
  const response = await post(multipartRequest());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.fileId, FILE_ID);
  assert.equal(body.reuse, true);
  assert.equal(calls.files[0].query['metadata.userId'], OWNER);
  assert.equal(calls.writes.length, 0);
});

for (const route of ROUTES) {
  for (const authCase of [
    { label: 'authentication throws', authResponse: async () => { throw new Error('secret-token upstream failure'); } },
    { label: 'authentication returns invalid JSON', authResponse: async () => new Response('not-json-secret-token') },
    { label: 'a null identity response', authBody: null },
    { label: 'an array identity response', authBody: [{ _id: OWNER }] },
    { label: 'an invalid identity string', authBody: { _id: 'not-a-user-id' } },
    { label: 'an object identity', authBody: { _id: { $ne: null } } },
    { label: 'an error marker beside an identity', authBody: { _id: OWNER, response: 'Missing User' } },
  ]) {
    test(`${route}: ${authCase.label} fails closed with a generic HTTP 401`, async () => {
      const { post, calls } = harness(route, authCase);
      const response = await post(requestFor(route));
      assert.equal(response.status, 401);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.error, 'auth_error');
      assert.equal(typeof body.message, 'string');
      assert.ok(body.message.length > 0, 'CLI upload errors need a message field');
      assert.doesNotMatch(JSON.stringify(body), /secret-token|upstream|not-json/);
      assert.equal(calls.errors.length, 0, 'authentication errors must not log raw upstream error messages');
      assertNoDataAccess(calls);
    });
  }
}

for (const route of JSON_ROUTES) {
  for (const invalidBody of [null, [], true, 42, 'valid-token']) {
    test(`${route}: JSON ${JSON.stringify(invalidBody)} is rejected with HTTP 400`, async () => {
      const { post, calls } = harness(route);
      const response = await post(jsonRequest(invalidBody));
      assert.equal(response.status, 400);
      assert.equal(calls.auth.length, 0);
      assertNoDataAccess(calls);
    });
  }

  test(`${route}: whitespace tokens are rejected with HTTP 400`, async () => {
    const { post, calls } = harness(route);
    const response = await post(jsonRequest({ ...validBody(route), token: '  \t' }));
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assertNoDataAccess(calls);
  });
}

for (const route of ID_ROUTES) {
  test(`${route}: private and nonexistent IDs produce the same denial`, async () => {
    const stranger = harness(route, { identity: STRANGER });
    const missing = harness(route, { documents: [] });
    const deniedResponse = await stranger.post(jsonRequest(validBody(route)));
    const missingResponse = await missing.post(jsonRequest(validBody(route)));
    assert.equal(deniedResponse.status, missingResponse.status);
    assert.equal(await deniedResponse.text(), await missingResponse.text());
    assert.equal(stranger.calls.reads.length, 0);
    assert.equal(stranger.calls.files.length, 0);
  });
}

for (const yaml of ['plain scalar', '7', 'false', 'null', '- first\n- second', '2026-10-17', '!!binary c2VjcmV0']) {
  test(`submitExp: YAML ${JSON.stringify(yaml)} is not an experiment mapping`, async () => {
    const { post, calls } = harness('submitExp');
    const response = await post(multipartRequest({ yaml }));
    assert.equal(response.status, 400);
    assertNoDataAccess(calls);
  });
}

for (const field of ['file', 'userToken', 'execFileID']) {
  test(`submitExp: ${field} with the wrong multipart value type returns HTTP 400`, async () => {
    const form = new FormData();
    form.set('userToken', 'valid-token');
    form.set('execFileID', FILE_ID);
    form.set('file', new Blob(['name: experiment']), 'experiment.yaml');
    if (field === 'file') form.set(field, 'not-a-file');
    else form.set(field, new Blob(['invalid']), 'invalid.txt');
    const { post, calls } = harness('submitExp');
    const response = await post(new Request('http://localhost/test', { method: 'POST', body: form }));
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assertNoDataAccess(calls);
  });
}

for (const file of ['not-a-file', {}, { filepath: [] }, { filepath: '   ' }]) {
  test(`uploadFile: malformed parsed file ${JSON.stringify(file)} returns HTTP 400`, async () => {
    const { post, calls } = harness('uploadFile', { uploadFiles: { file } });
    const response = await post(multipartRequest());
    assert.equal(response.status, 400);
    assert.equal(calls.auth.length, 0);
    assertNoDataAccess(calls);
  });
}

for (const route of ROUTES.filter((route) => route !== 'tokenAuth')) {
  test(`${route}: data failures return generic HTTP 500 without leaking raw errors`, async () => {
    const secret = 'secret-token-password-private-document';
    const { post, calls } = harness(route, { dataError: new Error(secret) });
    const response = await post(requestFor(route));
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), new RegExp(secret));
    assert.equal(calls.errors.length, 0, 'raw data errors must not be logged by the route');
  });
}
