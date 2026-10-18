# Proposal: Adding an Auto Mode to the Agentic Plan

## 1. Summary
The current [Agentic Implementation Plan](agentic_plan.md) was written last year under the assumption that the AI agent should be trusted as little as possible. Every result is kept away from the agent, and the user has to manually release data before the agent can see it. Following client feedback that this is too strict given how far AI agents have come, we propose splitting agent behavior into two modes:

- **Manual mode**: the current plan, essentially unchanged.
- **Auto mode**: the agent can submit and rerun experiments and read their results without asking each time, within limits the user sets.

This document explains what we keep from the original plan, what we change or remove and why, and how auto mode would work. The longer-term goal the client described, where the agent tries inputs, looks at the results, and tunes the inputs on its own, is covered as a second phase (Section 6), since it builds on auto mode but adds its own problems.

## 2. Why the Original Plan Is Strict
The original plan treats the agent and its LLM provider as untrusted (the "CHELL"). Two rules follow from that:

- **S-1 / S-2:** the agent never sees experiment results or artifacts. Sensitive results are written to a local "handoff region" instead of being returned to the agent.
- **Consent gesture (§4.3, §5.7):** the user must take an explicit action (copy/paste, moving a file, etc.) to release each result to the agent. §5.7 says friction here is deliberate and that requests to make consent easier should be treated with skepticism.

Most of the human-in-the-loop cost in the plan comes from these two rules. In contrast, the plan asks for very little approval on *actions*: submitting an experiment only needs an audit record (S-8).

This matters for the client's goal. **An agent that cannot see results cannot tune inputs.** As written, the plan makes the "try, observe, adjust" loop impossible without a human copying results back to the agent after every run.

## 3. What We Keep
Most of the original plan does not create friction for the user and still makes sense. We propose keeping all of the following in both modes.

| Item | Section | Why we keep it |
|---|---|---|
| Local MCP facade calling the existing REST API | §4.1, §4.3, §6.1 | The architecture decision is unrelated to strictness. It reuses the CLI's auth and the existing endpoints. |
| GitHub token introspection for auth | §4.1, §6.2 | Same as above. No reason to revisit. |
| Functional invariants I-1, I-2, I-3 | §3.1 | These are about correctness (one call per tool call, no altered arguments, no made-up response data), not about restricting the agent. |
| S-3 Credential confinement | §3.2 | The agent never needs the token. Keeping it hidden costs the user nothing. |
| S-4 Bounded tool surface (static allowlist) | §3.2, §5.3 | More important in auto mode. With no human approving each call, the fixed set of tools is the main limit on what the agent can do. |
| S-5 Diagnostic discipline, S-6 Egress confinement | §3.2 | No user friction, and they protect the token and data from leaking through logs or network calls. |
| S-8 Audit integrity, health check, degraded mode | §3.2, §4.2 | More important in auto mode. When nobody approves actions as they happen, the audit log is how the user finds out afterward what the agent did. |
| Fail closed, CI checks, refusal tests, SDK telemetry caution | §5.4, §5.5, §5.6, §5.8, §5.9 | Good engineering practices that apply to either mode. |
| Localhost-only binding for the facade | §7 Gaps | More important in auto mode, since a spoofed caller would also get auto-mode permissions. |
| The HIGH-sensitivity handoff path | §4.3 | Kept as the behavior for manual mode and for experiments marked sensitive in auto mode. |

## 4. What We Change or Remove

| Item | Current | Proposed | Why |
|---|---|---|---|
| **S-1 Result confidentiality** | Absolute: the agent never sees results. | Conditional: applies in manual mode, and in auto mode for experiments marked sensitive. | The tuning loop requires the agent to read results. Many experiments (addNums, class projects, benchmarks) have no confidentiality requirement. |
| **S-2 Artifact confidentiality** | Absolute. | Same condition as S-1, plus a size cap on anything returned to the agent. | Same reason. The size cap keeps large artifacts from flooding the agent's context. |
| **Per-result consent gesture** | Required for every HIGH result. | Removed for non-sensitive experiments in auto mode. Kept everywhere else. | This is the main source of friction the client objected to. |
| **§5.7 "The user is a cooperator, not an obstacle"** | Treat requests to ease consent with skepticism. | Rewrite: friction is still the right choice for sensitive data, but the user decides what is sensitive, per experiment. | The client has made this decision explicitly, and it should be recorded in the plan rather than left in conflict with it. |
| **§5.2 Default new operations to HIGH** | Per tool. | Keep, and add a per-experiment sensitivity flag that also defaults to sensitive. | Keeps the safe default. Marking an experiment non-sensitive is a one-time choice by the user, not a step for every result. |
| **Local log `user_approval` field** | Yes/no. | Replace with `mode` and `approved_by` (`user` or `auto`). | So the log can tell a user-approved action apart from one auto mode did on its own. |
| **Scope: agent quality out of scope** | §2 | Still true for the model's choices, but loop limits (budgets, stopping rules) come into scope. | Once the agent can act repeatedly without a human, limiting how much it can do becomes an infrastructure concern. |

Nothing is deleted outright. The strict path becomes manual mode, and it still covers sensitive data in auto mode.

## 5. Auto Mode Design (Phase 1)

### 5.1 Choosing the mode
- The user sets the mode when starting the facade, for example `glados-mcp --mode auto` or in a config file. The default is `manual`.
- **The agent can neither read nor change the mode through any tool.** This follows §5.3: model output must never be able to expand what the agent is allowed to do.
- The facade prints the active mode on startup so the user always knows which mode is running.

### 5.2 Behavior by tool type

| Tool type | Examples | Manual mode | Auto mode |
|---|---|---|---|
| Read-only | list experiments, get status | Allow | Allow |
| Mutating | submit experiment, rerun with new parameters | Ask the user | Allow, within budget |
| Destructive | delete experiment or results | Ask the user | **Still ask the user** |
| Results (non-sensitive experiment) | get results summary | Handoff region + consent | Returned to the agent |
| Results (sensitive experiment) | get results summary | Handoff region + consent | Handoff region + consent |

### 5.3 Experiment sensitivity flag
- A new field on the experiment document, set by the user through the web UI or CLI. The agent has no tool to change it.
- Defaults to sensitive.
- Experiments the agent derives from an existing one (for example, a rerun with changed parameters) inherit the parent's flag, so the agent can't "launder" a sensitive experiment into a non-sensitive one.

### 5.4 Guardrails in place of approvals
Auto mode swaps per-action approval for limits set up front:
- **Budget per session:** maximum number of experiment submissions, maximum concurrent runs, and maximum tool calls per minute. When a limit is hit, the facade refuses further calls (fail closed). This also covers the tool-call flood threat in §7.
- **Scope:** by default the agent can only change experiments it created in the current session or experiments the user explicitly pointed it at.
- **Stop switch:** stopping the facade immediately ends the agent's access. A CLI command to cancel all runs started in the session would also be useful.
- **Rate limit awareness:** every call triggers GitHub token introspection, which counts toward the 5,000 requests/hour limit (§2 of the original plan). An agent polling for status could exhaust that limit, so the facade should cache introspection results for a short period and limit how often status can be polled.

### 5.5 Audit additions
Every audit record (local and remote) gains `mode`, `approved_by`, `session_id`, and `parent_experiment_id` when there is one. This lets the user reconstruct everything an auto-mode session did.

### 5.6 Invariant changes (summary)
- **S-1, S-2:** apply in manual mode, and in auto mode for experiments with the sensitive flag set.
- **New S-9, Mode integrity:** the mode and the sensitivity flag are set only by the user, outside the agent's reach. No tool can read or change them.
- **New S-10, Budget enforcement:** in auto mode, no mutating call completes once a session limit is reached.

Both new invariants can be tested in CI in the same way as §5.6 of the original plan: check the tool registry statically for S-9, and inject a failure at the budget limit for S-10.

## 6. Phase 2: The Tuning Loop
The client's longer-term idea is for the agent to experiment on its own: pick inputs, run them, look at the results, and choose better inputs next time. Phase 1 makes this possible (the agent can read results), but a reliable loop needs more.

### 6.1 How it fits GLADOS today
GLADOS already runs every combination of a parameter's `min` / `max` / `step` range (`apps/runner/modules/configs.py`). The agent doesn't need to run points one at a time. A natural loop is **coarse to fine**: run a wide grid, read the results, then submit a new experiment with narrower ranges around the best region. This uses the platform the way it's already designed and keeps the number of submissions small.

### 6.2 What needs to be built or decided
- **User-declared search space.** The user states which parameters the agent may change and the allowed bounds for each. The facade rejects anything outside those bounds. This follows the same idea as S-4: the agent picks values, but only within a fixed, declared set.
- **Structured result summaries.** A tool that returns the metrics the user chose (for example, the columns of the result CSV), not raw files. This keeps responses small and predictable.
- **Stopping rules.** The loop ends when any of these is true: the budget is used up, the target metric is reached, or there has been no improvement for N rounds.
- **Lineage.** Each derived experiment records its parent and the parameter changes, so the user can see the path the agent took.
- **Waiting on long runs.** Experiments can take a long time. We need to decide between polling (limited by the rate limits in 5.4) and having the platform notify the facade when a run finishes.
- **Compute cost.** The loop uses shared cluster resources, so budgets may need to be set per user or by an admin, not only per session.

### 6.3 Why it's a separate phase
Each item above is a design problem of its own, and none of them is needed to deliver the basic auto mode. Building Phase 1 first gives us a working, testable base and real usage to learn from before we design the loop.

## 7. Risks and Tradeoffs
- **Results reach the LLM provider.** For non-sensitive experiments this is accepted by design. The per-experiment flag leaves that choice to the user.
- **Prompt injection through results.** Once results reach the agent, a result file could contain text that tries to steer it. The fixed tool list, budgets, and "destructive actions still ask" rule limit what a steered agent can actually do.
- **Runaway compute.** Covered by budgets and stopping rules, but the limits have to be set sensibly.
- **Less oversight while it runs.** Offset by the stronger audit records in 5.5. The tradeoff is reviewing after the fact instead of approving each action.

## 8. Proposed Milestones
1. Revise the original plan's sections listed in Section 4 (after this proposal is approved).
2. Build the MCP facade with manual mode as specified in the original plan.
3. Add the mode switch, sensitivity flag, budgets, and audit fields (auto mode, Phase 1).
4. Test end to end with the addNums experiment in both modes (original plan §8.1).
5. Design and prototype the tuning loop (Phase 2).

## 9. Questions for Discussion
1. Is a per-experiment sensitivity flag the right level of detail, or would a per-user default be enough?
2. Should auto mode be limited to privileged/admin users at first, as the original plan suggests for the feature overall?
3. Which actions should always require approval, even in auto mode? We propose delete only.
4. For Phase 2, who sets compute budgets: the user, an admin, or both?
