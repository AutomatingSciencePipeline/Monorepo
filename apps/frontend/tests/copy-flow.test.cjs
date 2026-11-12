const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { frontendRequire, frontendRoot } = require('../app/api/cli/tests/helpers.cjs');

const ts = frontendRequire('typescript');
const filename = path.join(frontendRoot, 'app/components/flows/AddExperiment/NewExperiment.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let copyEffect;
function findCopyEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
    const dependencies = node.arguments[1];
    if (dependencies && ts.isArrayLiteralExpression(dependencies)
      && dependencies.elements.some((entry) => entry.getText(source) === 'copyID')) {
      copyEffect = node.arguments[0];
    }
  }
  ts.forEachChild(node, findCopyEffect);
}
findCopyEffect(source);
assert.ok(copyEffect, 'The experiment copy effect must be present');
const compiledEffect = ts.transpileModule(`const effect = ${copyEffect.getText(source)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

const drain = () => new Promise(setImmediate);
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function setup(options = {}) {
  const calls = { lookup: [], refresh: [], copy: [], values: [], fileIds: [], fields: [], statuses: [], copyIds: [], errors: [] };
  const experiment = {
    creator: options.creator ?? 'owner',
    file: 'source-file',
    name: 'Copied experiment',
    description: 'Original settings',
    hyperparameters: [{ name: 'x', type: 'integer', default: 1 }],
    tags: ['existing'],
    timeout: 7200,
    trialResult: 'result.csv',
    trialResultLineNumber: 1,
    sendEmail: false,
    configFileFormat: 'ini',
  };
  const effect = vm.runInNewContext(compiledEffect + '\n effect;', {
    copyID: 'source-experiment',
    session: { user: { id: 'owner' } },
    isDefault: false,
    FormStates: { Info: 'info' },
    getDocumentFromId: (id) => {
      calls.lookup.push(id);
      if (options.lookup) return options.lookup.promise;
      return Promise.resolve(options.missing ? null : experiment);
    },
    refreshFileTimestamp: async (id) => {
      calls.refresh.push(id);
      if (options.fileError) throw new Error('File not found');
      return options.fileOperation?.promise;
    },
    copyFile: async (id, userId) => {
      calls.copy.push({ id, userId });
      if (options.fileError) throw new Error('File not found');
      return options.fileOperation?.promise ?? 'copied-file';
    },
    form: {
      setValues: (values) => calls.values.push(JSON.parse(JSON.stringify(values))),
      setFieldValue: (name, value) => calls.fields.push({ name, value }),
    },
    setFileId: (value) => calls.fileIds.push(value),
    setCopyId: (value) => calls.copyIds.push(value),
    setStatus: (value) => calls.statuses.push(value),
    toast: { error: (message) => calls.errors.push(message) },
  }, { filename });
  return { calls, cleanup: effect() };
}

for (const creator of ['owner', 'shared-owner']) {
  test(`copy preserves settings and recovers when the ${creator} executable is unavailable`, async () => {
    const h = setup({ creator, fileError: true });
    await drain();
    assert.equal(h.calls.values.length, 1);
    assert.equal(h.calls.values[0].name, 'Copied experiment');
    assert.equal(h.calls.values[0].description, 'Original settings');
    assert.equal(h.calls.values[0].timeout, 2);
    assert.deepEqual(h.calls.values[0].hyperparameters, [{ name: 'x', type: 'integer', default: 1 }]);
    assert.equal(h.calls.values[0].file, '');
    assert.deepEqual(h.calls.fileIds, ['']);
    assert.deepEqual(h.calls.fields, []);
    assert.deepEqual(h.calls.statuses, ['info']);
    assert.deepEqual(h.calls.copyIds, [null]);
    assert.equal(h.calls.errors.length, 1);
    assert.match(h.calls.errors[0], /Select or upload an executable file you own/);
    assert.equal(h.calls.refresh.length, creator === 'owner' ? 1 : 0);
    assert.equal(h.calls.copy.length, creator === 'owner' ? 0 : 1);
  });

  test(`copy selects the authorized executable for ${creator}`, async () => {
    const h = setup({ creator });
    await drain();
    const expected = creator === 'owner' ? 'source-file' : 'copied-file';
    assert.deepEqual(h.calls.fileIds, ['', expected]);
    assert.deepEqual(h.calls.fields, [{ name: 'file', value: expected }]);
    assert.deepEqual(h.calls.copyIds, [null]);
    assert.deepEqual(h.calls.errors, []);
    if (creator !== 'owner') {
      assert.deepEqual(h.calls.copy, [{ id: 'source-file', userId: 'owner' }]);
    }
  });
}

test('missing copy source reports a load failure and clears the pending copy', async () => {
  const h = setup({ missing: true });
  await drain();
  assert.deepEqual(h.calls.values, []);
  assert.deepEqual(h.calls.fileIds, ['']);
  assert.deepEqual(h.calls.copyIds, [null]);
  assert.deepEqual(h.calls.refresh, []);
  assert.deepEqual(h.calls.copy, []);
  assert.match(h.calls.errors[0], /Could not load the experiment to copy/);
});

test('cleanup prevents an old document lookup from changing the next copy dialog', async () => {
  const lookup = deferred();
  const h = setup({ lookup });
  h.cleanup();
  const before = JSON.stringify(h.calls);
  lookup.resolve({ creator: 'owner', file: 'old-file' });
  await drain();
  assert.equal(JSON.stringify(h.calls), before);
});

test('cleanup prevents an old executable copy from changing the next dialog', async () => {
  const fileOperation = deferred();
  const h = setup({ creator: 'shared-owner', fileOperation });
  await drain();
  h.cleanup();
  const before = JSON.stringify(h.calls);
  fileOperation.resolve('old-copied-file');
  await drain();
  assert.equal(JSON.stringify(h.calls), before);
});
