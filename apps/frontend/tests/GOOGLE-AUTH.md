# Google authentication regression tests

Install frontend dependencies with `npm ci`. Start an isolated local MongoDB and run:

```powershell
$env:GLADOS_AUTH_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/'
npm run test:google-auth
```

The URI must be credential-free and loopback-only. Tests create a random
`glados_google_test_*` database and drop only that database afterward. The dedicated
GitHub Actions workflow supplies MongoDB 8.0.13 and Node 20; no OAuth secrets are needed.

The tests use the application's `createAuthOptions` factory, including its Google
profile mapper, email-linking policy, adapter, and session callback. The real Auth.js
OIDC callback, PKCE, MongoDB adapter, account-linking, and session handling execute.
Google discovery and
token responses are mocked, with locally signed synthetic ID tokens. These tests
do not contact Google or prove real Google credentials, consent, or callback
registration work. Only test credentials, database name, logging, and provider
responses are substituted. The tests do not exercise the Next.js UI.

Coverage: subject/name mapping, repeated login after an email change, persisted role
and session, linking to an existing GitHub user, cross-user ownership collision,
missing subject, incorrect token issuer, and missing PKCE. Invalid mapper subjects
are also tested directly.

Upgrade coverage starts a login with the old mapper that omitted Google's subject,
then switches to the current application configuration. It checks that an unchanged
email preserves the user ID, admin role, pre-existing database session, experiment
ownership/sharing references, and file ownership metadata. A separate test demonstrates
the changed-email limitation, and another verifies linking through an active legacy
session. Experiment and file records are fixtures; these checks validate identity and
stored references, not the experiment runner or download routes.

## Local and production verification

For the current local app, register exactly
`http://localhost:3000/api/auth/callback/google` as an Authorized redirect URI on
the development Google OAuth client. Tilt's port does not determine this address.
A `redirect_uri_mismatch` is a separate Google Cloud configuration error; this
code change cannot update the OAuth client's registration.

After configuration, verify actual Google login, repeat login, and refresh. Review
existing Google account records separately: earlier code may have stored random
provider IDs. This change does not rewrite or delete historical records; an email
match can link a stable account through the existing policy. If email has changed
for a legacy record, manual recovery may be required. Do not infer or bulk rewrite
identity mappings without verification.

## Existing database records during deployment

Neither authentication change runs a bulk migration, clears collections, or deletes
existing users, accounts, sessions, experiments, or files. Database names, collection
names, and the application's session policy remain unchanged. Normal successful
logins can create account/session records as before.

`accounts.providerAccountId` identifies a Google or GitHub account, while `users._id`
is the application's user identity. `accounts.userId` and `sessions.userId` reference
that user. Changing the provider mapping does not replace the user's `_id`.

- A record already keyed by Google's stable subject reuses the same user. The
  existing Auth.js flow does not refresh stored user email/name on returning OAuth
  login; this change preserves that behavior rather than migrating profile fields.
- A historical random-ID Google account with the same email reuses the existing
  user under the existing email-linking policy. Auth.js adds a stable Google account
  referencing that user; it leaves the historical account intact. Later logins use
  the stable record. The user's stored role is retained.
- If the historical user's email has changed and there is no active session or
  stable account mapping, Auth.js cannot identify the previous user. It creates a
  separate user with the default role. Old data remains with the old user and will
  not appear under the new user ID. This is a recovery case, not data deletion.
- An active valid session can link a previously unlinked Google identity to its
  existing user even after an email change. An identity already owned by another
  user is rejected, rather than reassigned.
- Existing valid database sessions continue to resolve the same users, provided
  the deployment retains the same database, cookie settings, and authentication
  secret. This change does not intentionally sign everyone out.

These behaviors are demonstrated against a synthetic local database. Production
contents, indexes, duplicate email records, malformed account references, and
historical identity mappings have not been audited. Before rollout, a database owner
should take a backup and perform a read-only check of those conditions. Preserve
user IDs when recovering confirmed legacy accounts, because experiments use
`creator`/`sharedUsers` and uploaded file metadata uses `userId`. Do not bulk replace
random account IDs or merge users using an unverified email or guessed identity.
