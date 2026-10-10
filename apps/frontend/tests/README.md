# Authentication regression tests

Install frontend dependencies using the repository lockfile. Start an isolated local
MongoDB instance, then run from `apps/frontend`:

```powershell
$env:GLADOS_AUTH_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/'
npm run test:auth
```

The suite accepts only credential-free loopback MongoDB URIs. It creates a random
`glados_auth_test_*` database and drops only that database after testing. A missing
URI fails the run, so a unit-only run cannot be mistaken for full integration coverage.

OAuth token and profile responses are synthetic. Auth.js, PKCE checks, the MongoDB
adapter, account linking, and database sessions execute for real. No production
accounts, GitHub tokens, or OAuth app secrets are needed.

Coverage includes new/returning accounts, role persistence, legacy UUID records,
cross-user account collisions, existing Google users linking GitHub, missing PKCE,
missing GitHub identity, and sanitized database errors. Error logging is separately
checked against payloads containing credentials.

For an ephemeral MongoDB, `mongodb-memory-server@10.2.3` with MongoDB 8.0.13 was
used during local validation. It downloads the MongoDB binary; it is not an app
runtime dependency. The suite also works against a separately started local MongoDB.

Passing these tests does not verify real GitHub OAuth credentials, deployed callback
URLs, cookies through the production proxy, or historical production database data.
Complete a browser sign-in with the local development OAuth app before deployment.
Legacy-account repairs need a verified identity mapping and collision checks; the
sign-in callback deliberately performs no manual migration.

The default mocked callback now includes GitHub's real `iss=https://github.com/login/oauth` parameter. The suite verifies that this issuer succeeds, a different issuer is rejected, and older callbacks without the optional issuer remain compatible. This reproduces the real local failure seen with the pinned provider before explicitly configuring its issuer.
