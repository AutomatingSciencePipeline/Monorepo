# CLI authentication regression tests

Install dependencies with the npm lockfile, then run the CLI suite from `apps/frontend`:

```sh
npm ci
npm run test:cli
npm run type-check
```

The CLI tests run on Node.js 20 or later. They execute the actual TypeScript authentication and route handlers with real Next.js responses and MongoDB identifiers. GitHub, MongoDB connections, and file storage are mocked; no credentials or running services are required for `npm run test:cli`. The integration tests connect the real authentication function to the real route handlers.

Coverage includes first-time and existing users, authentication refusals before data access, owner/shared-user visibility, malformed arguments, and successful CLI response compatibility.

`npm test` runs the GitHub and Google Auth.js regression suites, followed by this CLI suite. The OAuth suites can also run separately with `npm run test:auth` and `npm run test:google-auth`. Start an isolated local MongoDB instance and set its URI before running all tests:

```powershell
$env:GLADOS_AUTH_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/'
npm test
```

The Auth.js suites require a credential-free loopback MongoDB URI, create random `glados_auth_test_*` and `glados_google_test_*` databases, and drop those databases after testing. A missing URI fails the run. They exercise the real Auth.js OAuth flows and MongoDB adapter with synthetic provider responses; no GitHub or Google credentials are required. See the [GitHub Auth.js test README](../../../../tests/README.md) and [Google authentication test README](../../../../tests/GOOGLE-AUTH.md) for coverage and setup details. The frontend CI workflow provides the isolated MongoDB service and runs all three suites through `npm test`.
