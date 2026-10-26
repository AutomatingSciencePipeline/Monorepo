const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSource, frontendRequire } = require('./helpers.cjs');

const { ObjectId } = frontendRequire('mongodb');
const USER_ID = '507f1f77bcf86cd799439011';
const EXPERIMENT_ID = '507f1f77bcf86cd799439012';
const FILE_ID = '507f1f77bcf86cd799439013';

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$and') return value.every((part) => matches(document, part));
    if (key === '$or') return value.some((part) => matches(document, part));
    if (value && typeof value === 'object' && '$in' in value) {
      return Array.isArray(document[key]) && document[key].some((item) => value.$in.includes(item));
    }
    return document[key] != null && String(document[key]) === String(value);
  });
}

function setup({ githubStatus = 200 } = {}) {
  const documents = { users: [], accounts: [] };
  const calls = { experiments: 0, submissions: [] };
  const clientPromise = Promise.resolve({
    db: () => ({
      collection: (name) => {
        if (name === 'experiments') {
          return {
            findOne: async (query) => {
              calls.experiments++;
              const experiment = {
                _id: new ObjectId(EXPERIMENT_ID), creator: USER_ID, sharedUsers: [],
                status: 'RUNNING', passes: 2, fails: 1, totalExperimentRuns: 8,
              };
              return matches(experiment, query) ? experiment : null;
            },
          };
        }
        return {
          findOne: async (query) => documents[name].find((document) =>
            Object.entries(query).every(([key, value]) => String(document[key]) === String(value))) ?? null,
          insertOne: async (document) => {
            const insertedId = document._id ?? new ObjectId(USER_ID);
            documents[name].push({ ...document, _id: insertedId });
            return { acknowledged: true, insertedId };
          },
        };
      },
    }),
  });
  const mongodb = {
    __esModule: true, default: clientPromise,
    DB_NAME: 'test-db', COLLECTION_EXPERIMENTS: 'experiments',
  };
  const auth = loadSource('tokenAuth.ts', { './lib/mongodb': mongodb }, {
    fetch: async () => Response.json(githubStatus === 200
      ? { id: 123, login: 'new-user', email: 'new@example.test', avatar_url: '' }
      : { message: 'Bad credentials' }, { status: githubStatus }),
  });
  function route(name) {
    return loadSource(`app/api/cli/${name}/route.ts`, {
      '../../../../tokenAuth': auth,
      '../../../../lib/mongodb': mongodb,
      '../../../../lib/mongodb_funcs': {
        submitExperimentCLI: async (...args) => {
          calls.submissions.push(args);
          return EXPERIMENT_ID;
        },
      },
    }).POST;
  }
  return { route, calls, documents };
}

function statusRequest() {
  return new Request('http://localhost/api/cli/status', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'synthetic-token', eid: EXPERIMENT_ID }),
  });
}

function submitRequest() {
  const form = new FormData();
  form.set('userToken', 'synthetic-token');
  form.set('file', new Blob(['name: New experiment\n']), 'experiment.yaml');
  form.set('execFileID', FILE_ID);
  return new Request('http://localhost/api/cli/submitExp', { method: 'POST', body: form });
}

test('real authentication and status preserve the new user identity on the first and second request', async () => {
  const { route, documents, calls } = setup();
  const post = route('status');
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await post(statusRequest());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true, status: 'RUNNING', current_permutation: 3, total_permutations: 8,
    });
  }
  assert.equal(documents.users.length, 1);
  assert.equal(documents.accounts.length, 1);
  assert.equal(calls.experiments, 2);
});

test('real authentication passes the first-time user identity into experiment submission', async () => {
  const { route, calls } = setup();
  const response = await route('submitExp')(submitRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, expId: EXPERIMENT_ID });
  assert.equal(calls.submissions.length, 1);
  assert.deepEqual(calls.submissions[0].slice(1), [USER_ID, 'new@example.test', 'user', FILE_ID]);
});

test('real invalid-token authentication stops both status queries and submissions', async () => {
  const { route, documents, calls } = setup({ githubStatus: 401 });
  assert.equal((await route('status')(statusRequest())).status, 401);
  assert.equal((await route('submitExp')(submitRequest())).status, 401);
  assert.equal(calls.experiments, 0);
  assert.equal(calls.submissions.length, 0);
  assert.equal(documents.users.length, 0);
  assert.equal(documents.accounts.length, 0);
});
