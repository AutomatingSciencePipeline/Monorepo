# Google authentication regression tests

Install frontend dependencies with `npm ci`. Start an isolated local MongoDB and run:

```powershell
$env:GLADOS_AUTH_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/'
npm run test:google-auth
```

The URI must be credential-free and loopback-only. Tests create a random
`glados_google_test_*` database and drop only that database afterward. The dedicated
GitHub Actions workflow supplies MongoDB 8.0.13 and Node 20; no OAuth secrets are needed.

The tests use the application's `googleProfile` mapper, real Auth.js OIDC callback,
PKCE, MongoDB adapter, account-linking, and session handling. Google discovery and
token responses are mocked, with locally signed synthetic ID tokens. These tests
do not contact Google or prove real Google credentials, consent, or callback
registration work. The test configuration preserves the current Google email-linking
policy. It does not exercise the Next.js UI or the complete application auth module.

Coverage: subject/name mapping, repeated login after an email change, persisted role
and session, linking to an existing GitHub user, cross-user ownership collision,
missing subject, incorrect token issuer, and missing PKCE. Invalid mapper subjects
are also tested directly.

## Local and production verification

For the current local app, register exactly
`http://localhost:3300/api/auth/callback/google` as an Authorized redirect URI on
the development Google OAuth client. Tilt's port does not determine this address.
A `redirect_uri_mismatch` is a separate Google Cloud configuration error; this
code change cannot update the OAuth client's registration.

After configuration, verify actual Google login, repeat login, and refresh. Review
existing Google account records separately: earlier code may have stored random
provider IDs. This change does not rewrite or delete historical records; an email
match can link a stable account through the existing policy. If email has changed
for a legacy record, manual recovery may be required. Do not infer or bulk rewrite
identity mappings without verification.
