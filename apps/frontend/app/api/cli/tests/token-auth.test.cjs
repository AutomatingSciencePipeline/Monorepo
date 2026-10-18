const assert = require('node:assert/strict');
const test = require('node:test');
const { inspect } = require('node:util');
const { loadSource, frontendRequire } = require('./helpers.cjs');

const { ObjectId } = frontendRequire('mongodb');
const TOKEN = 'ghp_auth_test_secret_do_not_expose';
const OTHER_SECRET = 'github_response_secret_do_not_expose';
const USER_ID = '507f1f77bcf86cd799439011';
const NEW_USER_ID = '507f1f77bcf86cd799439012';
const PROFILE = {
  id: 12345,
  login: 'cli-user',
  email: 'cli@example.com',
  avatar_url: 'https://avatars.example.com/cli-user',
};

function identity(value) {
  if (value instanceof ObjectId) return value.toHexString();
  return value;
}

function matches(document, query) {
  return Object.entries(query).every(([key, value]) =>
    identity(document[key]) === identity(value));
}

function existingIdentity() {
  const userId = new ObjectId(USER_ID);
  return {
    accounts: [{
      provider: 'github',
      providerAccountId: String(PROFILE.id),
      userId,
      access_token: OTHER_SECRET,
    }],
    users: [{
      _id: userId,
      name: PROFILE.login,
      email: PROFILE.email,
      image: PROFILE.avatar_url,
      role: 'user',
    }],
  };
}

// These collections retain inserted documents so the first request and later
// requests exercise the same account-to-user relationship as MongoDB.
function makeHarness(options = {}) {
  const documents = {
    accounts: [...(options.accounts ?? [])],
    users: [...(options.users ?? [])],
  };
  const calls = { fetch: [], reads: [], writes: [], logs: [], databases: [] };
  const collections = {};
  for (const name of ['accounts', 'users']) {
    collections[name] = {
      async findOne(query) {
        calls.reads.push({ collection: name, query });
        if (options.failAt === `${name}.findOne`) {
          throw new Error(`Database failed with ${TOKEN}`);
        }
        if (name === 'users' && Object.hasOwn(options, 'userReadResult')) {
          return options.userReadResult;
        }
        return documents[name].find((document) => matches(document, query)) ?? null;
      },
      async insertOne(document) {
        calls.writes.push({ collection: name, operation: 'insertOne', document: { ...document } });
        if (options.failAt === `${name}.insertOne`) {
          throw new Error(`Database failed with ${TOKEN}`);
        }
        if (name === 'users' && (options.invalidInsertedId || Object.hasOwn(options, 'insertedUserId'))) {
          return { acknowledged: true, insertedId: options.insertedUserId };
        }
        const insertedId = document._id ?? new ObjectId(NEW_USER_ID);
        documents[name].push({ ...document, _id: insertedId });
        return { acknowledged: options.unacknowledgedAt !== name, insertedId };
      },
      async deleteOne(query) {
        calls.writes.push({ collection: name, operation: 'deleteOne', query });
        const index = documents[name].findIndex((document) => matches(document, query));
        if (index === -1) return { acknowledged: true, deletedCount: 0 };
        documents[name].splice(index, 1);
        return { acknowledged: true, deletedCount: 1 };
      },
    };
  }

  const client = {
    db(name) {
      calls.databases.push(name);
      if (options.failAt === 'client.db') throw new Error(`Database failed with ${TOKEN}`);
      return {
        collection(collectionName) {
          assert.ok(collections[collectionName], `Unexpected collection ${collectionName}`);
          return collections[collectionName];
        },
      };
    },
  };
  // A lazy thenable avoids an unhandled rejection before auth awaits the client.
  const lazyClientPromise = {
    then(resolve, reject) {
      return (options.failAt === 'client.connect'
        ? Promise.reject(new Error(`Connection failed with ${TOKEN}`))
        : Promise.resolve(client)).then(resolve, reject);
    },
  };
  const clientPromise = options.eagerConnectionFailure
    ? Promise.reject(new Error(`Connection failed with ${TOKEN}`))
    : lazyClientPromise;
  const captureLog = (...args) => calls.logs.push(args.map((arg) => inspect(arg)).join(' '));
  const { tokenBasedAuth } = loadSource('tokenAuth.ts', {
    './lib/mongodb': { default: clientPromise, __esModule: true, DB_NAME: 'gladosdb' },
  }, {
    console: { log: captureLog, warn: captureLog, error: captureLog, info: captureLog, debug: captureLog },
    async fetch(url, init = {}) {
      calls.fetch.push({ url, init });
      if (options.githubDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.githubDelayMs));
      }
      if (options.failAt === 'fetch') throw new Error(`GitHub failed with ${TOKEN}`);
      const status = options.githubStatus ?? 200;
      const profile = Object.hasOwn(options, 'profile') ? options.profile : PROFILE;
      const body = options.githubBody ?? JSON.stringify(profile);
      return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
    },
  });

  async function authenticate(...tokens) {
    const token = tokens.length ? tokens[0] : TOKEN;
    const response = await tokenBasedAuth(token);
    assert.ok(response instanceof Response, 'Authentication must return an HTTP Response');
    const text = await response.text();
    assertNoCredentialLeaks(text);
    return { response, text, body: text ? JSON.parse(text) : null };
  }

  function assertNoCredentialLeaks(text) {
    const output = `${text}\n${calls.logs.join('\n')}`;
    for (const secret of [TOKEN, OTHER_SECRET]) {
      assert.ok(!output.includes(secret), 'Credentials must not appear in responses or logs');
    }
  }

  return { authenticate, calls, documents };
}

function assertUnauthorized(result, harness) {
  assert.equal(result.response.status, 401, 'Unusable credentials or identity must return 401');
  assertFailure(result);
  assert.equal(harness.calls.writes.length, 0, 'Rejected authentication must not write auth records');
}

function assertFailure(result) {
  assert.ok(result.response.status >= 400, 'Failure must not return a success response');
  assert.ok(!result.body?._id, 'Failure must not expose an authenticated user identity');
}

test('an existing GitHub account authenticates as its linked local user', async () => {
  const harness = makeHarness(existingIdentity());
  const { response, body } = await harness.authenticate();
  assert.equal(response.status, 200);
  assert.equal(body._id, USER_ID);
  assert.equal(body.email, PROFILE.email);
  assert.equal(body.role, 'user');
  assert.equal(harness.calls.writes.length, 0);
  assert.equal(harness.calls.fetch.length, 1);
  const request = harness.calls.fetch[0];
  assert.equal(request.url, 'https://api.github.com/user');
  assert.equal(new Headers(request.init.headers).get('Authorization'), `Bearer ${TOKEN}`);
  assert.equal((request.init.method ?? 'GET').toUpperCase(), 'GET');
});

test('the first request provisions a linked user and returns its usable _id', async () => {
  const harness = makeHarness();
  const { response, body } = await harness.authenticate();
  assert.equal(response.status, 200);
  assert.equal(body._id, NEW_USER_ID, 'Return the new user identity, not an insert result');
  assert.equal(body.email, PROFILE.email);
  assert.equal(body.role, 'user');
  assert.equal(harness.documents.users.length, 1);
  assert.equal(harness.documents.accounts.length, 1);
  const account = harness.documents.accounts[0];
  assert.equal(account.provider, 'github');
  assert.equal(account.providerAccountId, String(PROFILE.id));
  assert.equal(identity(account.userId), body._id);
});

test('a newly provisioned identity remains the same on the next request', async () => {
  const harness = makeHarness();
  const first = await harness.authenticate();
  const second = await harness.authenticate();
  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
  assert.equal(first.body._id, NEW_USER_ID);
  assert.equal(second.body._id, first.body._id);
  assert.equal(harness.documents.users.length, 1);
  assert.equal(harness.documents.accounts.length, 1);
});

test('a valid profile with a private email still authenticates with an identity', async () => {
  const harness = makeHarness({ profile: { ...PROFILE, email: null } });
  const result = await harness.authenticate();
  assert.equal(result.response.status, 200);
  assert.equal(result.body._id, NEW_USER_ID);
});

test('serialized MongoDB user ids remain usable identities', async () => {
  const fixture = existingIdentity();
  fixture.accounts[0].userId = USER_ID;
  fixture.users[0]._id = USER_ID;
  fixture.users[0].role = 'admin';
  const harness = makeHarness(fixture);
  const result = await harness.authenticate();
  assert.equal(result.response.status, 200);
  assert.equal(result.body._id, USER_ID);
  assert.equal(result.body.role, 'admin', 'Existing privileges come from the local user');
  assert.ok(ObjectId.isValid(result.body._id));
  assert.equal(harness.calls.writes.length, 0);
});

test('an account for another provider cannot supply the GitHub user identity', async () => {
  const fixture = existingIdentity();
  fixture.accounts[0].provider = 'google';
  fixture.users[0].role = 'admin';
  const harness = makeHarness(fixture);
  const result = await harness.authenticate();
  assert.equal(result.response.status, 200);
  assert.equal(result.body._id, NEW_USER_ID);
  assert.equal(result.body.role, 'user');
  assert.equal(harness.documents.users.length, 2);
  assert.equal(harness.documents.accounts.length, 2);
});

test('extra GitHub fields cannot disclose credentials or grant local privileges', async () => {
  const harness = makeHarness({ profile: {
    ...PROFILE, access_token: OTHER_SECRET, token: TOKEN, role: 'admin', _id: USER_ID,
  } });
  const result = await harness.authenticate();
  assert.equal(result.response.status, 200);
  assert.equal(result.body._id, NEW_USER_ID);
  assert.equal(result.body.role, 'user');
  assert.equal(result.body.access_token, undefined);
  assert.equal(result.body.token, undefined);
});

for (const [name, token] of [
  ['missing', undefined],
  ['null', null],
  ['empty', ''],
  ['whitespace only', '   '],
  ['non-string', 12345],
]) {
  test(`${name} token fails closed without auth writes`, async () => {
    const harness = makeHarness(existingIdentity());
    const result = await harness.authenticate(token);
    assertUnauthorized(result, harness);
  });
}

for (const status of [401, 403]) {
  test(`GitHub ${status} cannot authenticate even if the body resembles a valid profile`, async () => {
    const harness = makeHarness({ ...existingIdentity(), githubStatus: status });
    const result = await harness.authenticate();
    assertUnauthorized(result, harness);
  });
}

test('GitHub bad-credentials body returns 401 without creating a local user', async () => {
  const harness = makeHarness({ githubStatus: 401, profile: { message: 'Bad credentials' } });
  assertUnauthorized(await harness.authenticate(), harness);
});

for (const [name, id] of [
  ['missing', undefined],
  ['null', null],
  ['empty', ''],
  ['zero', 0],
  ['negative', -1],
  ['fractional', 1.5],
  ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ['non-numeric string', 'not-a-github-id'],
  ['object', {}],
  ['array', []],
  ['boolean', true],
]) {
  test(`a GitHub profile with a ${name} id returns 401 without auth writes`, async () => {
    const harness = makeHarness({ profile: { ...PROFILE, id } });
    assertUnauthorized(await harness.authenticate(), harness);
  });
}

for (const [name, profile] of [
  ['null', null],
  ['array', []],
  ['string', 'not a user'],
]) {
  test(`a ${name} GitHub identity returns 401 without auth writes`, async () => {
    const harness = makeHarness({ profile });
    assertUnauthorized(await harness.authenticate(), harness);
  });
}

for (const [name, login] of [
  ['missing', undefined],
  ['empty', ''],
  ['whitespace only', '   '],
  ['non-string', 12345],
]) {
  test(`a GitHub profile with a ${name} login returns 401 without auth writes`, async () => {
    const harness = makeHarness({ profile: { ...PROFILE, login } });
    assertUnauthorized(await harness.authenticate(), harness);
  });
}

for (const field of ['email', 'avatar_url']) {
  test(`a malformed GitHub ${field} cannot provision an invalid user record`, async () => {
    const harness = makeHarness({ profile: { ...PROFILE, [field]: { unexpected: true } } });
    assertUnauthorized(await harness.authenticate(), harness);
  });
}

test('an orphaned account cannot authenticate or provision a second user', async () => {
  const fixture = existingIdentity();
  const harness = makeHarness({ accounts: fixture.accounts });
  assertUnauthorized(await harness.authenticate(), harness);
});

for (const [name, userId] of [
  ['missing', undefined],
  ['null', null],
  ['empty', ''],
  ['whitespace only', '   '],
  ['malformed string', 'not-an-object-id'],
  ['numeric', 12345],
  ['object', {}],
]) {
  test(`an account with a ${name} linked user id returns 401`, async () => {
    const fixture = existingIdentity();
    fixture.accounts[0].userId = userId;
    const harness = makeHarness(fixture);
    assertUnauthorized(await harness.authenticate(), harness);
  });
}

for (const [name, userId] of [
  ['missing', undefined],
  ['null', null],
  ['empty', ''],
  ['whitespace only', '   '],
  ['malformed string', 'not-an-object-id'],
  ['numeric', 12345],
  ['object', {}],
]) {
  test(`a local user with a ${name} _id cannot become an authenticated identity`, async () => {
    const fixture = existingIdentity();
    fixture.users[0]._id = userId;
    // Independently exercise the retrieved-user boundary after a valid account
    // lookup, rather than relying on the account-link guard to reject it.
    const harness = makeHarness({ ...fixture, userReadResult: fixture.users[0] });
    assertUnauthorized(await harness.authenticate(), harness);
  });
}

test('GitHub network failure returns a closed response without writing auth records', async () => {
  const harness = makeHarness({ failAt: 'fetch' });
  assertFailure(await harness.authenticate());
  assert.equal(harness.calls.writes.length, 0);
});

test('malformed GitHub JSON returns 401 without writing auth records', async () => {
  const harness = makeHarness({ githubBody: '{invalid json' });
  assertUnauthorized(await harness.authenticate(), harness);
});

test('GitHub service failure cannot authenticate from a valid-looking body', async () => {
  const harness = makeHarness({ ...existingIdentity(), githubStatus: 503 });
  assertFailure(await harness.authenticate());
  assert.equal(harness.calls.writes.length, 0);
});

for (const failAt of ['client.connect', 'client.db', 'accounts.findOne', 'users.findOne']) {
  test(`${failAt} failure returns a closed response without auth writes or credential leaks`, async () => {
    const harness = makeHarness({ ...existingIdentity(), failAt });
    assertFailure(await harness.authenticate());
    assert.equal(harness.calls.writes.length, 0);
  });
}

test('an already rejected connection promise fails closed while GitHub would be slow', async () => {
  const harness = makeHarness({ eagerConnectionFailure: true, githubDelayMs: 30 });
  assertFailure(await harness.authenticate());
  assert.equal(harness.calls.writes.length, 0);
});

for (const [name, token] of [['missing', undefined], ['non-string', 12345]]) {
  test(`a ${name} token remains a clean 401 when the eager connection promise rejects`, async () => {
    const harness = makeHarness({ eagerConnectionFailure: true });
    assertUnauthorized(await harness.authenticate(token), harness);
    // Give Node an event-loop turn to surface any detached rejected promise.
    await new Promise((resolve) => setImmediate(resolve));
  });
}

for (const failAt of ['users.insertOne', 'accounts.insertOne']) {
  test(`${failAt} failure cannot report successful authentication`, async () => {
    const harness = makeHarness({ failAt });
    assertFailure(await harness.authenticate());
    if (failAt === 'users.insertOne') {
      assert.ok(!harness.calls.writes.some((call) => call.collection === 'accounts'),
        'Failed user creation must not write an account with an unusable user id');
    }
  });
}

test('a missing inserted user id cannot produce success or a linked account', async () => {
  const harness = makeHarness({ invalidInsertedId: true });
  assertFailure(await harness.authenticate());
  assert.ok(!harness.calls.writes.some((call) => call.collection === 'accounts'),
    'An undefined inserted id must not be stored as an account userId');
});

for (const insertedUserId of [null, '', 'not-an-object-id', 12345, {}]) {
  test(`an unusable inserted user id ${inspect(insertedUserId)} cannot authenticate or link an account`, async () => {
    const harness = makeHarness({ insertedUserId });
    assertFailure(await harness.authenticate());
    assert.ok(!harness.calls.writes.some((call) => call.collection === 'accounts'),
      'An unusable inserted identity must not be linked to a GitHub account');
  });
}

for (const collection of ['users', 'accounts']) {
  test(`an unacknowledged ${collection} write cannot report successful authentication`, async () => {
    const harness = makeHarness({ unacknowledgedAt: collection });
    assertFailure(await harness.authenticate());
    if (collection === 'users') {
      assert.ok(!harness.calls.writes.some((call) => call.collection === 'accounts'),
        'Unacknowledged user creation must not be linked to a GitHub account');
    }
  });
}
