# Agentic Roadmap: Phase Plan

## 1. Purpose

This document is the schedule for the agentic (MCP) feature. It complements two existing documents and does not repeat them:

- [Agentic Implementation Plan](agentic_plan.md): the architecture, invariants (I-1..I-3, S-1..S-8), and testing strategy.
- [Auto Mode Proposal](agentic_auto_mode_proposal.md): the manual/auto mode split, session design, limits, and the Phase 1 / Phase 2 scope for auto mode.

Here, "phase" means a block of calendar time with a demo at the end. Each phase is split into **three tracks**, one per team member. A track is a complete feature: it includes the Next.js route and MongoDB changes, the Python facade changes, and the tests that prove the refusals, so every member owns something they can demo end to end.

### 1.1 Decisions this plan is built on

| Decision | Choice | Where it came from |
|---|---|---|
| Order of work | Finish manual mode first, then auto mode | Team decision, 2026-10-29. Proposal §8 milestones 2 and 3. |
| Client questions in proposal §9 | Not yet answered. Defaults from the proposal are used and marked **CLIENT-PENDING(n)**, where *n* is the row in Section 9 of this document. | Section 9 lists every pending item. |
| Team split | Vertical by feature, three tracks per phase | Team decision. Shared conventions are enforced through `AGENTS.md` / `CLAUDE.md` because every member codes with an AI coding agent (Appendix A). |
| Calendar | Quarter system, 10-week quarters | Fall quarter has about two weeks left as of 2026-10-29. Winter and spring quarters follow. The project does not have to end exactly at the end of spring. |

### 1.2 Current state (2026-10-29)

- `apps/mcp-facade` exists on the `mcp-facade` branch with two read-only tools (`list_experiments`, `get_experiment_status`), GitHub device-flow login, a response allowlist, fixed error codes, a fake GLADOS server for tests, and a CI workflow. It was demoed to the client and well received.
- The REST side already has the CLI routes `tokenAuth`, `uploadFile`, `submitExp`, `queryExp`, `status`, `downloadResult`, `downloadZip`, `downloadLogs` under `apps/frontend/app/api/cli/`. There is no CLI cancel route; `cancelExperimentById` exists only for the web UI.
- Nothing from the auto mode proposal is implemented. There is no audit log, no sensitivity field, and no session concept.

## 2. Timeline overview

| Phase | When | Theme | Demo at the end |
|---|---|---|---|
| 0 | Fall quarter, remaining 2 weeks | Close out and align | Roadmap and REST contract approved by client |
| 1 | Winter weeks 1-5 | Manual mode complete | Agent submits addNums, result lands in the handoff region, user releases it, every mutation is audited |
| 2 | Winter weeks 6-10 | Auto mode foundation | User opens a session from the CLI; agent creates a run inside the bounds; an out-of-bounds run is refused |
| 3 | Spring weeks 1-4 | Auto mode integration and hardening | "Try x from 1 to 20 and tell me what you see" works against the dev cluster; invariant tests run in CI |
| 4 | Spring weeks 5-9 | Automatic tuning loop | Agent runs at least three rounds on its own, stops by a rule, and returns a report |
| 5 | Spring week 10 | Handoff | Final documentation and presentation |

Phase 4 is the one that can slip. Phases 1-3 deliver the proposal's "Phase 1: Auto Mode Infrastructure" and are useful on their own.

### 2.1 Track naming

Tracks are called **T1, T2, T3** in every phase. The same person keeps the same letter all year so the pending decisions and the risk table can refer to an owner. Which person takes which letter is decided in Phase 0. The work under each letter was balanced per phase, not across the year, so no track is "the testing track" or "the server track".

## 3. Phase 0: Close out and align (fall, remaining 2 weeks)

**Goal:** the current branch is merged, the client has what they need to answer the open questions, and the team has agreed on the shared rules before three people start editing the same code.

| Track | Tasks | Done when |
|---|---|---|
| T1 | Open and merge the `mcp-facade` PR against `main`, with the CI workflow green. Fix the README note about `/api/cli/status` now that #704 is merged. | Facade on `main`, CI passing. |
| T2 | Revise `agentic_plan.md` as listed in proposal §4 (S-1/S-2 scope, §5.7 rewrite, local log fields `mode` and `approved_by`, scope note on loop limits). | PR merged; proposal §8 milestone 1 done. |
| T3 | Write the shared conventions from Appendix A into `apps/mcp-facade/AGENTS.md` and `apps/frontend/app/api/cli/AGENTS.md`, with a `CLAUDE.md` next to each that imports it. Fill the REST contract table (Appendix B) for every Phase 1 route. | Both files merged; each Phase 1 route has an owner and a contract row. |
| All | Send proposal §9 questions to the client with this roadmap, and record the answers in the proposal. Agree on who is T1/T2/T3. | Client meeting held; Section 9 of this document updated. |

## 4. Phase 1: Manual mode complete (winter weeks 1-5)

**Goal:** the agent can do everything a CLI user can do (submit, watch, cancel, fetch results) under the rules of the original plan. Results never reach the agent directly; they go to the handoff region. Every mutation is audited remotely and locally. This is proposal §8 milestone 2 and original plan §8.1.

### 4.1 T1: Write operations and the local audit log

**Server**

- Add `/api/cli/cancelExp` (token auth, owner check, wraps `cancelExperimentById`). This is the only new route; submit already exists as `uploadFile` + `submitExp`.
- Confirm `uploadFile` and `submitExp` reject requests whose token does not resolve to a user, and that neither echoes the token.

**Facade**

- An **outbox** directory, `~/.glados/outbox/<bundle>/`, holding `experiment.yaml` and the experiment file. The user puts files there; the agent refers to a bundle by name. This satisfies S-4: the tool argument is a name matched against `[A-Za-z0-9_-]{1,64}` and resolved inside the outbox, never a path.
- Tools: `upload_bundle_file(bundle)` returns the `fileId`; `submit_experiment(bundle, file_id)` returns `exp_id`; `cancel_experiment(exp_id)`. Two tools for submit keeps I-1 intact (one REST call per tool). Alternative: one composite tool plus an amendment to I-1. **Decision for T1 in week 1; recommended: two tools.**
- Local audit log at `~/.glados/audit.log` using the `logging` module: `datetime, tool, mode, approved_by, result, error_code`. Written for every tool call, including reads and refusals. No arguments or response bodies are logged (S-5).

**Tests**

- I-1/I-2 for each new tool against `fake_glados` (one request per call; payload fields unchanged).
- Refusals: bundle name with `..` or `/`, missing `experiment.yaml`, file above the size cap, cancel of an experiment the user does not own (upstream `not_found` maps to `NOT_FOUND`).
- The audit log never contains the token or a response body (scan the file after a forced failure).

### 4.2 T2: Result handoff and the consent gesture (HIGH path)

**Server**

- Verify `downloadResult`, `downloadZip`, and `downloadLogs` accept the token and check ownership. Add a size field if missing so the facade can refuse oversize downloads before streaming.

**Facade**

- Tools `fetch_results(exp_id)`, `fetch_logs(exp_id)`, `fetch_zip(exp_id)`. Each writes to `~/.glados/handoff/<exp_id>/` and returns only `{ok, exp_id, artifact, bytes}`. No path and no content is returned (S-1, S-2).
- Consent gesture: the **watched inbox** from plan §4.3. The user moves a file from `handoff/<exp_id>/` to `handoff/released/<exp_id>/`. Tool `read_released(exp_id, artifact)` returns at most 64 KB from the released directory only, with a truncation note. Copy/paste remains available as the zero-code fallback.
- Document the UID limitation from the facade README: the agent's shell runs as the same OS user, so the inbox is a guard against accidental reads, not a hard boundary. Phase 3 T2 looks at UID separation.

**Tests**

- S-1 shape assertion: fetch tool results contain none of the bytes the fake server returned.
- S-5: stderr and the audit log contain no result content after a happy path and after a forced crash.
- Refusals: `read_released` on a file still in `handoff/<exp_id>/`, on an unknown `exp_id`, on a name with traversal characters; a response above 64 KB is cut and marked.

### 4.3 T3: Remote audit log, health check, degraded mode (S-8)

**Server**

- Capped collection `agent_audit` with the fields from plan §4.2 (`event_id, user_id, timestamp, action_type, action_result, agent_id`) plus the proposal §5.7 fields (`mode, approved_by, session_id, template_experiment_id`), the last two nullable until Phase 2.
- Insert-before-act in `uploadFile`, `submitExp`, and `cancelExp` when the request is marked as coming from an agent (a fixed request field, for example `"agent": "glados-mcp"`). If the insert fails, the route returns HTTP 503 with `{success: false, error: "degraded"}` and does nothing else (fail closed, plan §5.5).
- Health endpoint `/api/cli/auditHealth` that attempts a ping and a test insert.
- Append-only: no route updates or deletes from the collection, and the database role used by the frontend has no delete permission on it. Document how this is set in the Helm values.
- When the audit sink recovers after a failure, insert a `degraded_mode` record covering the gap (plan S-8, "no silent gaps").

**Facade**

- Call `auditHealth` before every mutating tool. If unhealthy, refuse with a new error code `DEGRADED` and do not call the mutating route. Read tools keep working.
- Add `DEGRADED` to `errors.py` and the README error list.

**Tests**

- Failure injection: `fake_glados` toggled to unhealthy, then every mutating tool is refused with `DEGRADED` and every read tool still succeeds.
- Server unit test: a mocked insert failure makes `submitExp` return 503 and leaves no experiment behind.
- Manual integration script for plan §8.3: scale the MongoDB pod to zero on the dev cluster, run the mutating tools, scale back up, confirm the gap record exists.

### 4.4 Shared integration (week 5)

- End-to-end run of addNums in manual mode against the dev cluster through a Tilt port-forward: login, upload, submit, poll status, cancel one run, fetch results, release, read released.
- All three tracks' tests run in the existing CI workflow.
- Client demo.

**Phase 1 done when** the end-to-end run above passes, every mutation has a row in `agent_audit` and a line in the local log, and a MongoDB outage makes submit fail with `DEGRADED`.

## 5. Phase 2: Auto mode foundation (winter weeks 6-10)

**Goal:** the server knows which experiments are non-sensitive, knows what an auto session is, and enforces its limits. The facade exposes the session tools. This is proposal §6.1 without the end-to-end agent run, which is Phase 3.

Phase 2 is the most server-heavy phase. T3 depends on T2's session routes. T2 writes the contract rows for the session routes in Appendix B by the end of week 6 so T3 can code against `fake_glados` from week 7.

### 5.1 T1: Sensitivity classification (S-9, proposal §5.1)

**Server**

- Add `sensitive: boolean` to the experiment document types and to `submitExp`; new experiments default to `true`. A one-time migration sets `sensitive: true` on every existing experiment.
- Web UI toggle on the experiment page, showing the four criteria from proposal §5.1 and requiring confirmation to mark non-sensitive. Only the owner can change it; the change is written to `agent_audit` with `approved_by: user`. **CLIENT-PENDING(1)**: owner's own statement is sufficient; no admin confirmation. **CLIENT-PENDING(6)**: UI text states the LLM provider may retain data.
- No CLI route for changing classification. The `agent` request marker on any route that could change it is rejected (S-12).
- Helper used by T2: `assertNonSensitive(expId, userId)`.

**Facade**

- `list_experiments` gains the `sensitive` field (argued LOW: it is a boolean the user set). No tool can change it.

**Tests**

- New experiment via `submitExp` is sensitive by default.
- Classification change with the `agent` marker is refused.
- Static check: the facade tool registry has no tool whose name or arguments mention sensitivity.

### 5.2 T2: Auto sessions and limits (S-10, S-11, S-12, proposal §5.3-5.4)

**Server**

- Collection `agent_sessions`: `session_id, user_id, template_experiment_id, bounds, limits, started_at, expires_at, ended_at, end_reason, counters (experiments, trials, running)`.
- Routes `/api/cli/session/start`, `/api/cli/session/end`, `/api/cli/session/get`. Start checks the template is owned by the user and non-sensitive (T1 helper) and that the user is privileged or admin (**CLIENT-PENDING(5)**). Start and end write `agent_audit` records with the bounds, limits, and end reason.
- Session tagging: experiments created through the session route carry `session_id`; every session route checks the tag against the active session (S-10).
- Enforcement of proposal §5.4 server-side limits with the proposed defaults (**CLIENT-PENDING(2)**): 4 h length, 10 experiments, 500 trials (computed the same way `apps/runner/modules/configs.py` expands ranges), 2 running at once, `workers` and `timeout` no higher than the template. Refusals return a short reason string from §5.4.
- Session end: queued experiments cancelled, running ones finish; `stop_all` option cancels running ones too (**CLIENT-PENDING(4)**).

**Out-of-band CLI (not an MCP tool, S-12)**

- `python -m glados_mcp session start --template <exp_id> --bound x=1:20 --limit experiments=10 ...`, `session end [--stop-all]`, `session show`. Lives in the facade package since the GLADOS CLI is a separate client.

**Tests**

- One test per limit at the boundary value and one past it.
- Expired session: every session route refuses.
- Sensitive template, template owned by someone else, non-privileged user: start refused.
- Static check: no MCP tool is registered for start, end, or limit changes.

### 5.3 T3: Session tool set and audit field changes (proposal §5.2 CAN column, §5.7)

**Server**

- `/api/cli/session/createRun`: copies the template, replaces only the hyperparameter values the agent supplied, rejects anything outside the bounds or any field other than hyperparameter values. Starts the run. Returns `exp_id` and remaining budget.
- `/api/cli/session/results`: returns the result CSV for an experiment tagged with the active session, nothing else (**CLIENT-PENDING(3)**: results and template parameters only, no code or `trialExtraFile`).
- Audit records for session actions carry `session_id`, `mode: auto`, `approved_by: auto`, `template_experiment_id`.

**Facade**

- Tools: `get_template()`, `create_run(values)`, `get_run_status(exp_id)`, `get_run_results(exp_id)`, `cancel_run(exp_id)`, `get_budget()`. All refuse with `NO_SESSION` when no active session exists.
- Facade-side limits from §5.4: 30 tool calls per minute, 1,000 per session, status at most every 30 s per experiment, 64 KB result cap with a truncation note.
- Results pass through the same allowlist discipline: unknown fields dropped, nothing added (I-3).

**Tests**

- The CANNOT column of proposal §5.2 as one parametrized test file, one case per row, each asserting a refusal. This file becomes the S-9..S-12 CI check in Phase 3.
- Rate limiter and poll cadence tests with a fake clock.
- 64 KB cap: response is cut, note present, nothing else changed.

**Phase 2 done when** a session can be opened from the CLI against the dev cluster with addNums as the template, `create_run` succeeds inside the bounds and is refused outside them, and the CANNOT test file passes.

## 6. Phase 3: Auto mode integration and hardening (spring weeks 1-4)

**Goal:** proposal §6.1 "done when" is fully met, the security claims are tested rather than argued, and the invariants are CI checks (plan §5.6).

### 6.1 T1: End-to-end agent test with a local model (plan §8.1)

- Request the 32 GB VM from the CSSE system administrator; install Ollama with an 8B-16B model, and Claude Code or an equivalent MCP host.
- Scripted scenarios: the manual mode flow from Phase 1, and "try x from 1 to 20 and tell me what you see" in a session. Save the transcripts in `docs/docs/infrastructure/agentic_test_runs/`.
- Prompt injection probe (proposal §7): a template whose result CSV contains text telling the agent to delete experiments or exceed the budget. Confirm every attempted CANNOT action is refused and audited.

### 6.2 T2: Security evaluation (plan §8.3, §7 gaps)

- Telemetry sweep: happy path and a forced crash in both modes; grep every output stream (stdout, stderr, local log, `agent_audit`, Next.js logs) for the token and for result bytes.
- Audit coverage sweep: every mutating route produces a record; MongoDB scale-down produces `DEGRADED` and a gap record.
- UID separation: run the facade under a separate OS user on Linux and macOS, document the setup, and measure whether the inbox gesture becomes a real boundary. If impractical, document the Claude Code deny rules as the supported mitigation.
- Write the incident response notes the plan §7 leaves open (what to do if a token leaks, if the audit collection fills, if a session misbehaves).

### 6.3 T3: Invariants as CI checks (plan §5.6) and documentation

- Wire these into `.github/workflows/python-test-mcp-facade.yml` and a new frontend test job: S-1 shape assertions, S-3/S-5 emit-path scan, S-4 static tool registry check, S-8 audit failure injection, S-9..S-12 from the Phase 2 CANNOT file.
- Coverage and pylint gates stay green with the new tools.
- User documentation: a tutorial page "Using GLADOS with an AI agent" (login, outbox, handoff, sessions, reading the audit log). README tools table updated.

**Phase 3 done when** the proposal §6.1 "done when" statement holds on the dev cluster and every invariant has a CI job. Demo on production requires the production TLS certificate to be renewed (it expired 2026-10-23), which is an infrastructure task outside this team.

## 7. Phase 4: Automatic tuning loop (spring weeks 5-9)

**Goal:** proposal §6.2. The user states an objective once; the agent runs rounds on its own; the facade, not the agent, decides when to stop. No new permissions are added.

### 7.1 T1: Objective and stopping rules

- `session start` gains `--objective <column> --direction max|min [--target <value>] [--patience <N>]`. Stored on the session.
- The facade tracks the best value per round from `get_run_results`. It stops the loop when the target is reached, when there is no improvement for N rounds, or when the budget is exhausted. After stopping, `create_run` is refused with `LOOP_STOPPED`.
- Tests: each stopping rule with a fake server returning scripted results.

### 7.2 T2: Coarse-to-fine rounds and round history

- Server: `agent_rounds` records `round_id, session_id, parent_round, exp_id, values, best_value`. `createRun` accepts `parent_round` and checks the new ranges are inside the parent's ranges as well as the session bounds.
- Facade: `get_round_history()` tool; `create_run` passes `parent_round`.
- Tests: narrowing outside the parent range refused; history returns rounds in order.

### 7.3 T3: Final report and end-to-end

- `get_report()` tool and `session report` CLI command: best values, round history, reason the loop stopped. Written to the handoff region as well, so the user has a copy independent of the agent.
- End-to-end on the Ollama VM with a benchmark-style experiment (for example a function to minimize built on addNums), at least three rounds, stop by rule, every round in `agent_audit`.

**Phase 4 done when** the proposal §6.2 "done when" statement holds.

## 8. Phase 5: Handoff (spring week 10)

| Track | Tasks |
|---|---|
| T1 | Final user documentation and the tutorial page; update `agentic_plan.md` and the proposal to as-built. |
| T2 | Developer and security documentation: threat model updates, incident response, open gaps for the next team. |
| T3 | Final presentation and recorded demo; issue list for anything not finished. |

## 9. Pending client confirmations

Defaults in use until the client answers. Each marker in this document and in code comments reads `CLIENT-PENDING(n)`.

| n | Question (proposal §9) | Default assumed | First affected |
|---|---|---|---|
| 1 | Is the owner's classification enough? | Yes; no admin confirmation | Phase 2 T1 |
| 2 | Are the §5.4 limits reasonable? | Yes; proposed values used | Phase 2 T2 |
| 3 | Can the agent read template code and `trialExtraFile`? | No; results CSV and parameters only | Phase 2 T3 |
| 4 | Running experiments at session end? | Finish; queued ones cancelled; `--stop-all` cancels running | Phase 2 T2 |
| 5 | Open to all users or privileged only? | Privileged and admin only | Phase 2 T2 |
| 6 | Provider data retention acceptable for non-sensitive? | Yes | Phase 2 T1 |
| 7 | *(new)* Submit through an outbox directory the user fills by hand? | Yes | Phase 1 T1 |
| 8 | *(new)* Consent gesture is the watched inbox? | Yes, with copy/paste as fallback | Phase 1 T2 |

## 10. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| Three people editing shared files (`errors.py`, `rest.py` route allowlist, `server.py` tool registry, the audit schema) | Appendix A rule: shared files change only in small, separate PRs that all three review. Coding agents follow the same rule through `AGENTS.md`. |
| Everyone needs both TypeScript and Python | Phase 1 tracks are facade-heavy and Phase 2 tracks are server-heavy, so each person meets each stack with a small first task. The contract table (Appendix B) is the shared vocabulary. |
| T3 blocked on T2 in Phase 2 | Contract rows written by end of week 6; `fake_glados` handlers written from the contract, not from the implementation. |
| GitHub rate limit (5,000 requests per hour) with polling | Facade poll cadence (30 s per experiment) and call caps from §5.4 are in Phase 2 T3. |
| Production TLS certificate expired 2026-10-23 | Demos use the dev cluster until renewed. Raise with infrastructure in Phase 0. |
| Phase 4 slips | Phases 1-3 are a complete, demoable product on their own. |

## Appendix A: Shared conventions for `AGENTS.md` / `CLAUDE.md`

Copy this into `apps/mcp-facade/AGENTS.md` and `apps/frontend/app/api/cli/AGENTS.md` in Phase 0 (T3). Put a `CLAUDE.md` next to each containing the single line `@AGENTS.md` so Claude Code and Codex read the same rules. The repository-level `AGENTS.md` rule (comments in English) still applies.

```markdown
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
- Decisions waiting on the client are marked CLIENT-PENDING(n) in comments, where n is the
  row in agentic_roadmap.md section 9.
```

## Appendix B: REST contract table

Filled in by the owning track before implementation starts. The facade's `fake_glados` is written from this table.

| Route | Phase / track | Request fields (besides `token`, `agent`) | Success response | Error codes | Status |
|---|---|---|---|---|---|
| `/api/cli/cancelExp` | 1 / T1 | `eid` | `{success, status}` | `auth_error, not_found, degraded` | stub |
| `/api/cli/auditHealth` | 1 / T3 | none | `{success, healthy}` | `auth_error` | stub |
| `/api/cli/session/start` | 2 / T2 | `template_eid, bounds, limits` | `{success, session_id, expires_at}` | `auth_error, not_found, sensitive_template, not_privileged, degraded` | stub |
| `/api/cli/session/end` | 2 / T2 | `session_id, stop_all` | `{success, end_reason}` | `auth_error, not_found, degraded` | stub |
| `/api/cli/session/get` | 2 / T2 | `session_id` | `{success, template, bounds, limits, budget}` | `auth_error, not_found` | stub |
| `/api/cli/session/createRun` | 2 / T3 | `session_id, values, parent_round` | `{success, eid, budget}` | `auth_error, no_session, out_of_bounds, budget_exhausted, concurrency_limit, degraded` | stub |
| `/api/cli/session/results` | 2 / T3 | `session_id, eid` | `{success, csv}` | `auth_error, no_session, not_found` | stub |
| `/api/cli/session/rounds` | 4 / T2 | `session_id` | `{success, rounds}` | `auth_error, no_session` | stub |

Existing routes (`tokenAuth`, `uploadFile`, `submitExp`, `queryExp`, `status`, `downloadResult`, `downloadZip`, `downloadLogs`) keep their current shapes. Phase 1 adds the `agent` marker and the audit insert to the mutating ones without changing their responses.
