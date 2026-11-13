# Conventions for the GLADOS agentic feature

Read docs/docs/infrastructure/agentic_plan.md sections 3 and 5 before changing anything here.

## Facade (apps/mcp-facade)
- Every tool takes validated scalar arguments only. No filesystem paths, URLs, or route names
  as arguments (S-4). Names that select files are matched against [A-Za-z0-9_-]{1,64} and
  resolved inside a fixed directory.
- Every tool result is {"ok": true, ...allowlisted fields} or {"ok": false, "error": CODE}.
  CODE comes only from errors.py. Never pass upstream error text through.
- Each tool makes exactly one REST call (I-1). Composite operations are separate tools.
- Returned fields are listed in a tuple with a comment stating why each is LOW sensitivity.
  Anything not listed is dropped (I-3, plan 5.2). Nothing is computed or inferred.
- A new route is added to ALLOWED_ROUTES in rest.py in the same PR as its first use, with a test.
- Never log arguments, request bodies, response bodies, or the token (S-5). Log only tool
  name, mode, approved_by, result, and error code.
- Write the refusal tests before the happy-path test (plan 5.9). Every row of the CANNOT
  column in the auto mode proposal has a test.
- tests/fake_glados.py gets a handler for every new route, written from the contract table
  in docs/docs/infrastructure/agentic_roadmap.md Appendix B, not from the server code.

## Server (apps/frontend/app/api/cli)
- First statement of every route: resolve the token with tokenBasedAuth; on failure return
  {"success": false, "error": "auth_error"}. Never include the token in any response or log.
- Error responses are {"success": false, "error": "<snake_case_code>"} with a fixed set of
  codes. Do not return exception messages.
- Any route that changes state and is called with the agent marker inserts an agent_audit
  record first. If the insert fails, return 503 {"success": false, "error": "degraded"} and
  do nothing else (S-8, fail closed).
- Sessions, limits, bounds, and sensitivity are changed only by routes that reject the agent
  marker (S-12).

## Shared files
- errors.py, rest.py (ALLOWED_ROUTES), server.py (tool registry), the agent_audit schema,
  and the contract table are changed only in a small separate PR reviewed by all three
  team members. Feature PRs depend on that PR instead of editing these files.

## Markers
- Code that implements a client decision is marked CLIENT-DECISION(n) in a comment, where n
  is the row in agentic_roadmap.md section 9.
