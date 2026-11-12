const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../app/api/cli/tests/helpers.cjs');

const OWNER = '507f1f77bcf86cd799439011';
const OTHER = '507f1f77bcf86cd799439012';
const decoder = new TextDecoder();
const session = (role = 'user', id = OWNER) => ({ user: { id, role } });
const drain = () => new Promise(setImmediate);

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function matches(doc, query) {
  return Object.entries(query).every(([field, expected]) => {
    if (field === '$or') return expected.some((condition) => matches(doc, condition));
    const actual = field.split('.').reduce((value, key) => value?.[key], doc);
    if (expected && typeof expected === 'object' && expected.$type === 'array' && !Array.isArray(actual)) return false;
    if (expected && typeof expected === 'object' && '$exists' in expected) return (actual !== undefined) === expected.$exists;
    if (expected && typeof expected === 'object' && '$nin' in expected) {
      return expected.$nin.every((value) => Array.isArray(actual) ? !actual.includes(value) : actual !== value);
    }
    if (expected && typeof expected === 'object' && '$in' in expected) {
      return expected.$in.some((value) => Array.isArray(actual) ? actual.includes(value) : actual === value);
    }
    return actual === expected;
  });
}

function setup(route, initialSession = session(route === 'adminListen' ? 'admin' : 'user')) {
  let currentSession = initialSession;
  let authError = false;
  let queryError = false;
  let authGate;
  let authReturnHook;
  let queryGate;
  let watchClosed = false;
  let nextTimer = 0;
  const listeners = new Map();
  const timers = new Map();
  const calls = { auth: 0, queries: [], watches: [], closes: 0, enqueues: [], afterClose: 0, startErrors: [] };
  const docs = [
    { _id: '000000000000000000000001', creator: OWNER, sharedUsers: [], name: 'Owned', finished: false },
    { _id: '000000000000000000000002', creator: OTHER, sharedUsers: [OWNER], name: 'Shared', finished: false },
    { _id: '000000000000000000000003', creator: OTHER, sharedUsers: [], name: 'Private', finished: false },
    { _id: '000000000000000000000004', creator: OTHER, sharedUsers: [], name: 'Finished', finished: true },
  ];
  const watch = {
    on(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
      return watch;
    },
    removeListener(name, callback) {
      listeners.get(name)?.delete(callback);
      return watch;
    },
    async close() {
      calls.closes++;
      watchClosed = true;
      listeners.clear();
    },
  };
  const collection = {
    watch(pipeline, options) {
      calls.watches.push({ pipeline, options });
      watchClosed = false;
      return watch;
    },
    find(query) {
      return { toArray: async () => {
        calls.queries.push(query);
        // Capture the result before delaying it to expose stale in-flight snapshots.
        const result = structuredClone(docs.filter((doc) => matches(doc, query)));
        const gate = queryGate;
        queryGate = undefined;
        if (gate) {
          gate.entered.resolve();
          await gate.release.promise;
        }
        if (queryError) throw new Error('Mock query failure');
        return result;
      } };
    },
  };

  // Keep real stream semantics while observing enqueue attempts after close or cancel.
  class ObservedStream extends ReadableStream {
    constructor(source) {
      let closed = false;
      super({
        start(controller) {
          const observed = {
            enqueue(chunk) {
              if (closed) calls.afterClose++;
              calls.enqueues.push(decoder.decode(chunk));
              controller.enqueue(chunk);
            },
            close() {
              closed = true;
              controller.close();
            },
            error(error) {
              closed = true;
              controller.error(error);
            },
            get desiredSize() { return controller.desiredSize; },
          };
          const started = source.start?.(observed);
          Promise.resolve(started).catch((error) => calls.startErrors.push(error));
          return started;
        },
        cancel(reason) {
          closed = true;
          return source.cancel?.(reason);
        },
      });
    }
  }

  const globals = {
    ReadableStream: ObservedStream,
    TextEncoder,
    setInterval(callback, interval) {
      assert.equal(interval, 2500);
      const id = ++nextTimer;
      timers.set(id, callback);
      return id;
    },
    clearInterval(id) { timers.delete(id); },
  };
  const streamHelper = loadSource('lib/authorizedExperimentStream.ts', { 'server-only': {} }, globals);
  const mod = loadSource(`app/api/experiments/${route}/route.ts`, {
    '../../../../lib/authorizedExperimentStream': streamHelper,
    '../../../../auth': { auth: async () => {
      const call = ++calls.auth;
      const gate = authGate;
      authGate = undefined;
      if (gate) {
        gate.entered.resolve();
        await gate.release.promise;
      }
      if (authError) throw new Error('Mock session failure');
      const result = currentSession && structuredClone(currentSession);
      if (authReturnHook?.call === call) {
        const callback = authReturnHook.callback;
        authReturnHook = undefined;
        // Disconnect after isAuthorized resolves, before the caller's await resumes.
        queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => queueMicrotask(callback))));
      }
      return result;
    } },
    '../../../../lib/mongodb': {
      __esModule: true,
      default: Promise.resolve({ db: () => ({ collection: () => collection }) }),
      DB_NAME: 'test-db',
      COLLECTION_EXPERIMENTS: 'experiments',
    },
  }, globals);
  const abort = new AbortController();
  const request = {
    nextUrl: new URL(`http://localhost/api/experiments/${route}?uid=${OWNER}`),
    signal: abort.signal,
  };
  function block(kind) {
    const gate = { entered: deferred(), release: deferred() };
    if (kind === 'auth') authGate = gate;
    else queryGate = gate;
    return gate;
  }
  async function emit(name, value) {
    const results = await Promise.allSettled(Array.from(listeners.get(name) ?? [], (callback) => callback(value)));
    for (const result of results) {
      assert.equal(result.status, 'fulfilled', `${name} callback must handle shutdown and dependency failures`);
    }
    await drain();
  }
  async function emitChange(change) {
    const filter = calls.watches.at(-1)?.pipeline[0]?.$match;
    if (!filter || matches(change, filter)) await emit('change', change);
  }
  return {
    calls, docs, request, timers,
    get: () => mod.GET(request),
    change: (fields = { passes: 1 }) => emitChange({
      operationType: 'update', fullDocument: docs[0],
      updateDescription: { updatedFields: fields },
    }),
    replace: (document) => emitChange({ operationType: 'replace', fullDocument: document }),
    watchError: () => emit('error', new Error('Mock change stream failure')),
    async tick() {
      const results = await Promise.allSettled(Array.from(timers.values(), (callback) => callback()));
      for (const result of results) assert.equal(result.status, 'fulfilled', 'heartbeat must handle dependency failures');
      await drain();
    },
    blockAuth: () => block('auth'),
    blockQuery: () => block('query'),
    afterAuthChecks(count, callback) { authReturnHook = { call: calls.auth + count, callback }; },
    setSession(value) { currentSession = value; },
    failAuth(value = true) { authError = value; },
    failQuery() { queryError = true; },
    abort: () => abort.abort(),
    assertClean() {
      assert.equal(timers.size, 0, 'heartbeat timer must be cleared');
      assert.equal(watchClosed, true, 'database change stream must be closed');
      assert.equal(calls.afterClose, 0, 'closed/cancelled streams must never receive enqueue attempts');
      assert.equal(calls.startErrors.length, 0, 'stream initialization must handle shutdown and dependency failures');
    },
  };
}

async function read(reader) {
  let settled = false;
  let result;
  let failure;
  reader.read().then((value) => { result = value; settled = true; }, (error) => { failure = error; settled = true; });
  await drain();
  assert.equal(settled, true, 'stream must produce the expected chunk or close without waiting for a timer');
  if (failure) throw failure;
  return result;
}

async function data(reader) {
  const item = await read(reader);
  assert.equal(item.done, false);
  const value = decoder.decode(item.value);
  assert.ok(value.startsWith('data: '), 'expected an SSE data snapshot');
  return JSON.parse(value.slice(6));
}

async function open(h) {
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body.getReader();
  await data(reader);
  await drain();
  assert.equal(h.timers.size, 1);
  return reader;
}

async function closed(h, reader, enqueueCount) {
  await drain();
  assert.equal((await read(reader)).done, true, 'authorization loss or disconnect must close the stream');
  assert.equal(h.calls.enqueues.length, enqueueCount, 'no data or heartbeat may be emitted after shutdown');
  h.assertClean();
}

test('new admin streams reject anonymous and nonadmin sessions before database access', async () => {
  for (const [identity, status] of [[null, 401], [session(), 403], [session('privileged'), 403]]) {
    const h = setup('adminListen', identity);
    assert.equal((await h.get()).status, status);
    assert.equal(h.calls.watches.length, 0);
    assert.equal(h.calls.queries.length, 0);
    assert.equal(h.timers.size, 0);
  }
});

test('new user streams reject anonymous sessions, missing UID, and another identity', async () => {
  for (const [identity, uid, status] of [[null, OWNER, 401], [session(), null, 400], [session(), OTHER, 403]]) {
    const h = setup('listen', identity);
    if (uid) h.request.nextUrl.searchParams.set('uid', uid);
    else h.request.nextUrl.searchParams.delete('uid');
    assert.equal((await h.get()).status, status);
    assert.equal(h.calls.watches.length, 0);
    assert.equal(h.calls.queries.length, 0);
    assert.equal(h.timers.size, 0);
  }
});

test('user snapshots preserve owner/shared filtering and remove revoked shares', async (t) => {
  const h = setup('listen');
  t.after(() => h.abort());
  const response = await h.get();
  const reader = response.body.getReader();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned', 'Shared']);
  h.docs[1].sharedUsers = [];
  await h.change();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned']);
  h.docs[2].name = 'Still private';
  await h.change();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned']);
});

test('valid admin streams retain unfinished queue updates across reauthorization', async (t) => {
  const h = setup('adminListen');
  t.after(() => h.abort());
  const response = await h.get();
  const reader = response.body.getReader();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned', 'Shared', 'Private']);
  h.docs[0].finished = true;
  h.docs[2].name = 'Updated private';
  h.docs.push({ _id: '000000000000000000000005', creator: OTHER, sharedUsers: [], name: 'New private', finished: false });
  const authBefore = h.calls.auth;
  await h.change();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Shared', 'Updated private', 'New private']);
  assert.ok(h.calls.auth > authBefore, 'queue changes must reauthorize the current admin');
});

test('user snapshots exclude malformed shares while preserving ownership', async (t) => {
  const h = setup('listen');
  t.after(() => h.abort());
  h.docs[0].sharedUsers = OWNER;
  h.docs.push(
    { _id: '000000000000000000000005', creator: OTHER, sharedUsers: OWNER, name: 'Scalar share', finished: false },
    { _id: '000000000000000000000006', creator: OTHER, sharedUsers: 42, name: 'Numeric share', finished: false },
    { _id: '000000000000000000000007', creator: OTHER, sharedUsers: { id: OWNER }, name: 'Object share', finished: false },
  );
  const response = await h.get();
  const reader = response.body.getReader();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned', 'Shared']);
  await h.change();
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned', 'Shared']);
});

test('replacement revocation passes the watch filter and invalidates an in-flight user snapshot', async (t) => {
  const h = setup('listen');
  t.after(() => h.abort());
  const reader = await open(h);
  const enqueueCount = h.calls.enqueues.length;
  const gate = h.blockQuery();
  const sending = h.change();
  await gate.entered.promise;
  h.docs[1].sharedUsers = [];
  await h.replace(h.docs[1]);
  gate.release.resolve();
  await sending;
  assert.deepEqual((await data(reader)).map((doc) => doc.name), ['Owned']);
  assert.equal(h.calls.enqueues.length, enqueueCount + 1, 'captured shared rows must not survive replacement revocation');
});

for (const route of ['listen', 'adminListen']) {
  test(`${route} delivers progress under continuous changes with one query in flight`, async (t) => {
    const h = setup(route);
    t.after(() => h.abort());
    const reader = await open(h);
    const queryCount = h.calls.queries.length;
    const firstGate = h.blockQuery();
    const sending = h.change();
    await firstGate.entered.promise;
    h.docs[0].name = 'Second snapshot';
    for (let index = 0; index < 20; index++) await h.change();
    assert.equal(h.calls.queries.length, queryCount + 1);

    const secondGate = h.blockQuery();
    firstGate.release.resolve();
    await secondGate.entered.promise;
    assert.equal((await data(reader))[0].name, 'Owned', 'completed snapshots must flow while later changes are pending');
    h.docs[0].name = 'Latest snapshot';
    for (let index = 0; index < 20; index++) await h.change();
    assert.equal(h.calls.queries.length, queryCount + 2);
    secondGate.release.resolve();
    await sending;
    assert.equal((await data(reader))[0].name, 'Second snapshot');
    assert.equal((await data(reader))[0].name, 'Latest snapshot');
    assert.equal(h.calls.queries.length, queryCount + 3);
  });

  test(`${route} coalesces slow heartbeat and change authorization without overlap`, async (t) => {
    const h = setup(route);
    t.after(() => h.abort());
    const reader = await open(h);
    const enqueueCount = h.calls.enqueues.length;
    const queryCount = h.calls.queries.length;
    const authCount = h.calls.auth;
    const gate = h.blockAuth();
    const ticking = h.tick();
    await gate.entered.promise;
    for (let index = 0; index < 20; index++) {
      await h.tick();
      await h.change();
    }
    assert.equal(h.calls.auth, authCount + 1);
    assert.equal(h.calls.queries.length, queryCount);
    h.setSession(null);
    gate.release.resolve();
    await ticking;
    await closed(h, reader, enqueueCount);
    assert.equal(h.calls.queries.length, queryCount, 'pending changes cannot bypass failed reauthorization');
  });

  test(`${route} discards captured data after a transient final authorization failure`, async (t) => {
    const h = setup(route);
    t.after(() => h.abort());
    const reader = await open(h);
    const enqueueCount = h.calls.enqueues.length;
    const gate = h.blockQuery();
    const sending = h.change();
    await gate.entered.promise;
    h.failAuth();
    gate.release.resolve();
    await sending;
    assert.equal(h.calls.enqueues.length, enqueueCount);
    assert.equal(h.calls.closes, 0);
    h.docs[0].name = 'Fresh after recovery';
    h.failAuth(false);
    await h.tick();
    assert.equal((await data(reader))[0].name, 'Fresh after recovery');
  });

  for (const phase of ['initial', 'change']) {
    for (const delay of ['query', 'final authorization']) {
      test(`${route} coalesces an access change during a ${phase} snapshot delayed by its ${delay}`, async (t) => {
        const h = setup(route);
        t.after(() => h.abort());
        let reader;
        if (phase === 'change') reader = await open(h);
        const enqueueCount = h.calls.enqueues.length;
        const queryGate = h.blockQuery();
        const older = phase === 'initial' ? h.get() : h.change();
        await queryGate.entered.promise;
        if (phase === 'initial') reader = (await older).body.getReader();
        let authGate;
        if (delay === 'final authorization') {
          authGate = h.blockAuth();
          queryGate.release.resolve();
          await authGate.entered.promise;
        }

        // A newer snapshot removes a revoked share or a completed admin queue entry.
        if (route === 'listen') h.docs[1].sharedUsers = [];
        else h.docs[1].finished = true;
        const names = route === 'listen' ? ['Owned'] : ['Owned', 'Private'];
        await h.change(route === 'listen' ? { sharedUsers: [] } : { finished: true });
        (authGate ?? queryGate).release.resolve();
        await older;
        await drain();
        assert.deepEqual((await data(reader)).map((doc) => doc.name), names);
        assert.equal(h.calls.enqueues.length, enqueueCount + 1, 'a superseded snapshot must not restore removed experiments');

        h.docs[0].name = 'Updated owned';
        await h.change();
        assert.deepEqual((await data(reader)).map((doc) => doc.name), names.map((name) => name === 'Owned' ? 'Updated owned' : name));
        assert.equal(h.calls.enqueues.length, enqueueCount + 2, 'valid later snapshots must keep flowing');
      });
    }
  }

  for (const [reason, identity] of [
    ['revoked session', null],
    ['expired session', null],
    ['changed identity', session(route === 'adminListen' ? 'admin' : 'user', OTHER)],
    ...(route === 'adminListen' ? [['admin demotion', session('user')]] : []),
  ]) {
    for (const trigger of ['change', 'heartbeat']) {
      test(`${route} closes and releases resources on ${reason} during ${trigger}`, async (t) => {
        const h = setup(route);
        t.after(() => h.abort());
        const reader = await open(h);
        const enqueueCount = h.calls.enqueues.length;
        const queryCount = h.calls.queries.length;
        h.setSession(identity);
        if (trigger === 'change') await h.change();
        else await h.tick();
        await closed(h, reader, enqueueCount);
        assert.equal(h.calls.queries.length, queryCount, 'known invalid sessions must not read another snapshot');
        await h.change();
        await h.tick();
        assert.equal(h.calls.enqueues.length, enqueueCount);
      });
    }
  }

  for (const trigger of ['change', 'heartbeat']) {
    test(`${route} suspends delivery and recovers when reauthorization throws during ${trigger}`, async (t) => {
      const h = setup(route);
      t.after(() => h.abort());
      const reader = await open(h);
      const enqueueCount = h.calls.enqueues.length;
      h.failAuth();
      if (trigger === 'change') await h.change();
      else await h.tick();
      assert.equal(h.calls.enqueues.length, enqueueCount);
      assert.equal(h.calls.closes, 0);
      assert.equal(h.timers.size, 1);
      h.failAuth(false);
      await h.tick();
      if (trigger === 'change') await data(reader);
      else assert.equal(decoder.decode((await read(reader)).value), ': heartbeat\n\n');
      assert.equal(h.calls.enqueues.length, enqueueCount + 1);
    });
  }

  test(`${route} reauthorizes a valid heartbeat without querying snapshots`, async (t) => {
    const h = setup(route);
    t.after(() => h.abort());
    const reader = await open(h);
    const authBefore = h.calls.auth;
    const queriesBefore = h.calls.queries.length;
    await h.tick();
    const chunk = await read(reader);
    assert.equal(chunk.done, false);
    assert.equal(decoder.decode(chunk.value), ': heartbeat\n\n');
    assert.ok(h.calls.auth > authBefore);
    assert.equal(h.calls.queries.length, queriesBefore);
  });

  for (const phase of ['initial', 'change']) {
    test(`${route} rechecks authorization after an in-flight ${phase} query`, async (t) => {
      const h = setup(route);
      t.after(() => h.abort());
      let reader;
      if (phase === 'change') reader = await open(h);
      const enqueueCount = h.calls.enqueues.length;
      const gate = h.blockQuery();
      const operation = phase === 'initial' ? h.get() : h.change();
      await gate.entered.promise;
      h.setSession(route === 'adminListen' ? session('user') : null);
      gate.release.resolve();
      if (phase === 'initial') reader = (await operation).body.getReader();
      else await operation;
      await closed(h, reader, enqueueCount);
    });
  }

  for (const disconnect of ['abort', 'cancel']) {
    for (const trigger of ['snapshot', 'heartbeat']) {
      test(`${route} guards enqueue if ${disconnect} races the completed ${trigger} authorization check`, async (t) => {
        const h = setup(route);
        t.after(() => h.abort());
        const reader = await open(h);
        const enqueueCount = h.calls.enqueues.length;
        h.afterAuthChecks(trigger === 'snapshot' ? 2 : 1, () => {
          if (disconnect === 'abort') h.abort();
          else void reader.cancel();
        });
        if (trigger === 'snapshot') await h.change();
        else await h.tick();
        await closed(h, reader, enqueueCount);
      });
    }

    for (const phase of ['initial query', 'change query', 'change auth']) {
      test(`${route} handles ${disconnect} while awaiting ${phase}`, async (t) => {
        const h = setup(route);
        t.after(() => h.abort());
        let reader;
        if (phase !== 'initial query') reader = await open(h);
        const enqueueCount = h.calls.enqueues.length;
        const gate = phase === 'change auth' ? h.blockAuth() : h.blockQuery();
        const operation = phase === 'initial query' ? h.get() : h.change();
        if (phase === 'change auth') {
          // The original routes do not reauthorize; fail clearly instead of waiting forever.
          await drain();
          assert.ok(h.calls.auth > 1, 'change events must start a new authorization check');
        }
        await gate.entered.promise;
        if (phase === 'initial query') reader = (await operation).body.getReader();
        if (disconnect === 'abort') h.abort();
        else await reader.cancel();
        gate.release.resolve();
        await operation;
        await closed(h, reader, enqueueCount);
      });
    }
  }

  test(`${route} closes its watcher and timer when a snapshot query fails`, async (t) => {
    const h = setup(route);
    t.after(() => h.abort());
    const reader = await open(h);
    const enqueueCount = h.calls.enqueues.length;
    h.failQuery();
    await h.change();
    await closed(h, reader, enqueueCount);
  });

  test(`${route} closes its watcher and timer when the change stream fails`, async (t) => {
    const h = setup(route);
    t.after(() => h.abort());
    const reader = await open(h);
    const enqueueCount = h.calls.enqueues.length;
    await h.watchError();
    await closed(h, reader, enqueueCount);
  });
}
