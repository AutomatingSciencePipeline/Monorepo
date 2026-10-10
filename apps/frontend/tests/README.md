# Authentication regression tests

Install frontend dependencies using the repository lockfile. Start an isolated local
MongoDB instance, then run from `apps/frontend`:

```powershell
$env:GLADOS_AUTH_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/'
npm run test:auth
```

`npm test` also runs this suite. The frontend CI workflow starts an isolated
MongoDB service and runs lint, TypeScript checks, and the authentication tests.

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

## Existing database compatibility

The application's user ID (`users._id`) is different from a provider's account ID
(`accounts.providerAccountId`). Account records and database sessions refer to the
user ID; experiments store it in `creator` and uploaded files in `metadata.userId`.
This change does not reset these collections, rewrite user IDs, delete experiments,
or change the database name, session strategy, cookie settings, or authentication secret.

A returning GitHub user with a correct provider account ID keeps the same user and
role. For an old random account ID, the existing email-linking policy can attach the
correct GitHub identity to the same user when the email matches. The old account
record is retained. This is not a bulk repair of historical records: if no account,
matching email, or valid existing session identifies the old user, a new user can be
created and the old user's data will not be accessible through that new user ID.

Before production deployment, take a database backup and have an authorized operator
review legacy account links and indexes without changing them. Any manual repair
must verify ownership and account collisions first. Local regression tests establish
these code paths, not the contents or condition of the production database.

The default mocked callback now includes GitHub's real `iss=https://github.com/login/oauth` parameter. The suite verifies that this issuer succeeds, a different issuer is rejected, and older callbacks without the optional issuer remain compatible. This reproduces the real local failure seen with the pinned provider before explicitly configuring its issuer.
