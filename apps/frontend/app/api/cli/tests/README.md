# CLI authentication regression tests

After installing the frontend dependencies, run from `apps/frontend`:

```sh
node --test app/api/cli/tests/token-auth.test.cjs app/api/cli/tests/routes.test.cjs app/api/cli/tests/integration.test.cjs
npm run type-check
```

The tests run on Node.js 20 or later. They execute the actual TypeScript authentication and route handlers with real Next.js responses and MongoDB identifiers. GitHub, MongoDB connections, and file storage are mocked; no credentials or running services are required. The integration tests connect the real authentication function to the real route handlers.

Coverage includes first-time and existing users, authentication refusals before data access, owner/shared-user visibility, malformed arguments, and successful CLI response compatibility. The repository's existing `npm test` placeholder does not run this suite; use the command above.
