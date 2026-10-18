# CLI authentication regression tests

Install dependencies with the npm lockfile, then run the CLI suite from `apps/frontend`:

```sh
npm ci
npm run test:cli
npm run type-check
```

The CLI tests run on Node.js 20 or later. They execute the actual TypeScript authentication and route handlers with real Next.js responses and MongoDB identifiers. GitHub, MongoDB connections, and file storage are mocked; no credentials or running services are required for `npm run test:cli`. The integration tests connect the real authentication function to the real route handlers.

Coverage includes first-time and existing users, authentication refusals before data access, owner/shared-user visibility, malformed arguments, and successful CLI response compatibility.

`npm test` runs both the Auth.js regression suite (`npm run test:auth`) and this CLI suite. Start an isolated local MongoDB instance and set its URI before running all tests:

```powershell
$env:GLADOS_AUTH_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/'
npm test
```

The Auth.js suite requires a credential-free loopback MongoDB URI, creates a random `glados_auth_test_*` database, and drops that database after testing. A missing URI fails the run. It exercises the real Auth.js OAuth flow and MongoDB adapter with synthetic GitHub responses; no GitHub credentials are required. See [the Auth.js test README](../../../../tests/README.md) for coverage and setup details. The frontend CI workflow provides the isolated MongoDB service and runs both suites through `npm test`.
