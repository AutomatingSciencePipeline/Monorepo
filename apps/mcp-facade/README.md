# GLADOS MCP Facade

A local [MCP](https://modelcontextprotocol.io) server that lets an AI agent (for example Claude Code) read your GLADOS experiments on your behalf. It implements the facade described in the [Agentic Implementation Plan](../../docs/docs/infrastructure/agentic_plan.md).

The facade runs on your machine, holds your GitHub token, and is the only thing that talks to GLADOS. The agent can only call the tools listed below and only sees the fields they return.

```
Agent ──MCP over stdio──> facade ──HTTPS + token──> GLADOS /api/cli/*
      <── allowlisted fields or a fixed error code ──
```

## Tools

| Tool | Argument | Returns |
|---|---|---|
| `list_experiments` | `title`: exact experiment name, or `"*"` for all | `id, name, status, started_on, current_permutation, total_permutations` per experiment |
| `get_experiment_status` | `exp_id`: 24-character hex id | `status, current_permutation, total_permutations` |

Both are read-only. Every result has `"ok": true|false`. On failure, `error` is one of `NOT_LOGGED_IN`, `AUTH_FAILED`, `NOT_FOUND`, `INVALID_ARGUMENT`, `UPSTREAM_ERROR`, `UNAVAILABLE`. Upstream error text is never passed through.

> `get_experiment_status` depends on `/api/cli/status`, which returns `not_found` for every experiment until #701 is merged.

## Setup

Requires Python 3.12 (the `mcp` SDK needs 3.10+).

```bash
cd apps/mcp-facade
pipenv install            # or: python -m venv .venv && pip install "mcp>=2.3,<3"
pipenv run python -m glados_mcp login
```

`login` runs the GitHub device flow (the same OAuth app as the GLADOS CLI). Open the printed URL, enter the code, and the token is saved to `~/.glados/mcp_token`, readable only by you. `python -m glados_mcp logout` deletes it.

Register it with Claude Code, then start a **new** session so the tools load:

```bash
# from apps/mcp-facade
claude mcp add glados -e PYTHONPATH="$(pwd)" -- "$(pipenv --py)" -m glados_mcp serve
```

`PYTHONPATH` lets the server start no matter which directory Claude Code launches it from. With a plain venv, use the venv's Python path instead of `$(pipenv --py)`.

### Configuration

| Variable | Default | Notes |
|---|---|---|
| `GLADOS_BASE_URL` | `https://glados.csse.rose-hulman.edu` | Must be `https`. Plain `http` is only allowed for `localhost`/`127.0.0.1`, for example a Tilt port-forward or `ssh -L 3000:localhost:3000 <dev-server>`. Production is only reachable on the Rose-Hulman network. |
| `GLADOS_MCP_TOKEN_FILE` | `~/.glados/mcp_token` | Mainly for tests. |

## Security properties

These map to the invariants in the agentic plan, and each has tests in `tests/`.

- **Token confinement (S-3).** The token is attached only in `rest.py` and never appears in tool results or errors. If a GLADOS response ever contains the token, the call fails with `UPSTREAM_ERROR`.
- **Bounded tool surface (S-4).** Only the two tools above are registered. Each takes one validated string. There are no paths, URLs or endpoints in arguments.
- **Response allowlist (I-3, S-1).** Only listed scalar fields are returned. Unknown fields (including `tags`) are dropped, never invented.
- **Egress (S-6).** Requests go only to `GLADOS_BASE_URL` over verified TLS, with redirects and proxies disabled. `login` is a separate command that talks to GitHub, not part of the MCP server.
- **Errors (5.4, 5.5).** Every failure becomes a fixed code. Transport failures are retried at most twice (I-1); HTTP errors are not retried.
- **No network listener.** stdio only, so nothing else on the network can pose as the agent (plan §7).

### Known limitation

The agent's shell runs as the same OS user as the facade, so it could read `~/.glados/mcp_token` directly. Until the facade runs under a separate OS user, add a deny rule to your Claude Code settings:

```json
{
  "permissions": {
    "deny": ["Read(~/.glados/**)"]
  }
}
```

This blocks Claude Code's file-read tool, but a shell command could still read the file, so it reduces the risk rather than removing it. Also note that experiment names are user-entered text and reach the agent as data.

The `mcp` SDK depends on `opentelemetry-api`. Without an OpenTelemetry SDK installed and configured, it does nothing (plan 5.8).

## Development

```bash
pipenv install --dev
bash coverage.sh                                              # tests + coverage
pylint --fail-on=E --fail-under=9.0 --recursive=y glados_mcp tests
```

`tests/test_stdio_e2e.py` launches the real server over stdio with an MCP client, against `tests/fake_glados.py`, a small local stand-in for the GLADOS routes. No dev container is needed.
