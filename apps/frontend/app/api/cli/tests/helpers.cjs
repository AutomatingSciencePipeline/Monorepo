const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const frontendRoot = path.resolve(__dirname, '../../../..');
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'));
const ts = frontendRequire('typescript');
const allowedDependencies = new Set(['next/server', 'mongodb', 'js-yaml']);

function loadSource(relativePath, mocks = {}, globals = {}) {
  const filename = path.join(frontendRoot, relativePath);
  const canonical = (value) => value.replace(/\.(?:[cm]?js|tsx?)$/, '');
  const resolvedMocks = new Map(Object.entries(mocks)
    .filter(([name]) => name.startsWith('.'))
    .map(([name, value]) => [canonical(path.resolve(path.dirname(filename), name)), value]));
  const cache = new Map();
  return loadFile(filename);

  function loadFile(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    function requireMock(name) {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
      if (allowedDependencies.has(name)) return frontendRequire(name);
      if (name.startsWith('.')) {
        const resolved = path.resolve(path.dirname(filename), name);
        if (resolvedMocks.has(canonical(resolved))) return resolvedMocks.get(canonical(resolved));
        const cliRoot = path.join(frontendRoot, 'app', 'api', 'cli') + path.sep;
        if (resolved.startsWith(cliRoot)) {
          for (const candidate of [resolved, resolved + '.ts', resolved + '.js']) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return loadFile(candidate);
          }
        }
      }
      throw new Error(`Unmocked dependency: ${name}`);
    }
    const context = {
      Response, Request, Headers, FormData, Blob, Buffer, URL,
      console,
      fetch: async () => { throw new Error('Unexpected network request'); },
      ...globals,
    };
    const execute = vm.runInNewContext(
      '(function(require, module, exports, __filename, __dirname) {\n' + compiled + '\n})',
      context,
      { filename },
    );
    execute(requireMock, loadedModule, loadedModule.exports, filename, path.dirname(filename));
    return loadedModule.exports;
  }
}

module.exports = { loadSource, frontendRequire, frontendRoot };
