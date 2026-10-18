import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { MongoClient } from "mongodb";
import { Auth, customFetch } from "@auth/core";
import { createAuthOptions } from "../auth-options.mjs";
import { summarizeAuthError } from "../lib/auth-diagnostics.mjs";

test("diagnostics exclude tokens, email, messages, URLs and arbitrary fields", () => {
  const summary = summarizeAuthError({
    type: "AdapterError", message: "secret-token",
    cause: { provider: "github", token: "secret-token", err: {
      name: "MongoServerError", code: 11000,
      message: "mongodb://user:password@host email@example.com",
      stack: "secret-token", response: { access_token: "secret-token" },
    } },
  });
  assert.deepEqual(summary, {
    type: "AdapterError", provider: "github", cause: "MongoServerError", code: 11000,
  });
  assert.deepEqual(summarizeAuthError({ type: "secret-token", cause: {
    provider: "secret-token", err: { name: "secret-token", code: "secret-token" },
  } }), { type: "UnknownAuthError", provider: "unknown", cause: "UnknownError", code: undefined });
});

const uri = process.env.GLADOS_AUTH_TEST_MONGODB_URI;
if (!uri) throw new Error("Set GLADOS_AUTH_TEST_MONGODB_URI to an isolated local MongoDB URI before running test:auth");
// This suite creates and drops its own database. Never accept a production host.
if (uri && !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(uri)) {
  throw new Error("Tests require a credential-free loopback MongoDB URI");
}

test("Auth.js GitHub flow with real MongoDB adapter", async (t) => {
  const client = await new MongoClient(uri).connect();
  const databaseName = `glados_auth_test_${randomUUID().replaceAll("-", "")}`;
  const db = client.db(databaseName);
  const origin = "http://localhost:3100";
  let config, errors, profile;
  const baseFetch = globalThis.fetch;

  function setup() {
    errors = [];
    profile = { id: 1234567, email: "researcher@example.test", avatar_url: "https://example.test/avatar" };
    config = createAuthOptions(client, databaseName);
    config.basePath = "/api/auth";
    config.secret = "local-test-only-session-secret-at-least-32-characters";
    config.trustHost = true;
    config.logger = { error: (error) => errors.push(summarizeAuthError(error)) };
    const github = config.providers.find((provider) => provider.id === "github");
    github.options = { ...github.options,
      clientId: "test-client", clientSecret: "test-client-secret",
      userinfo: { request: async () => ({ ...profile }) },
      [customFetch]: async (url) => {
        assert.equal(new URL(url).href, "https://github.com/login/oauth/access_token");
        return Response.json({ access_token: "test-token", token_type: "bearer", scope: "read:user user:email" });
      },
    };
    // Every external OAuth response is mocked; no GitHub credentials are used.
    globalThis.fetch = () => { throw new Error("Unexpected network request in auth test"); };
  }
  async function request(path, jar, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await Auth(new Request(`${origin}/api/auth/${path}`, { ...init, headers }), config);
    for (const cookie of res.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const i = pair.indexOf("=");
      if (pair.slice(i + 1)) jar.set(pair.slice(0, i), pair.slice(i + 1));
      else jar.delete(pair.slice(0, i));
    }
    return res;
  }
  async function login(jar = new Map(), clearChecks = false, issuer = "https://github.com/login/oauth") {
    const csrf = await (await request("csrf", jar)).json();
    const response = await request("signin/github", jar, {
      method: "POST", body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${origin}/dashboard` }),
    });
    assert.equal(response.status, 302);
    const authorization = new URL(response.headers.get("location"));
    assert.equal(authorization.hostname, "github.com");
    assert.ok(authorization.searchParams.get("code_challenge"));
    const callback = new URLSearchParams({ code: "test-code" });
    if (issuer !== null) callback.set("iss", issuer);
    if (authorization.searchParams.has("state")) callback.set("state", authorization.searchParams.get("state"));
    if (clearChecks) for (const key of jar.keys()) if (/pkce|state/.test(key)) jar.delete(key);
    const result = await request(`callback/github?${callback}`, jar);
    return { result, jar, session: await (await request("session", jar)).json() };
  }
  async function scenario(name, fn) {
    await t.test(name, async () => {
      await db.dropDatabase();
      setup();
      try { await fn(); } finally { globalThis.fetch = baseFetch; }
    });
  }
  try {
    await scenario("new GitHub user receives a database session", async () => {
      const { result, session } = await login();
      assert.equal(result.headers.get("location"), `${origin}/dashboard`);
      assert.equal(session.user.email, profile.email);
      assert.equal(session.user.role, "user");
      const account = await db.collection("accounts").findOne({ provider: "github" });
      assert.equal(account.providerAccountId, String(profile.id));
      assert.equal(account.userId.toHexString(), session.user.id);
      assert.deepEqual(errors, []);
    });
    await scenario("returning user retains identity and role without duplicate accounts", async () => {
      const first = await login();
      const account = await db.collection("accounts").findOne({ provider: "github" });
      await db.collection("users").updateOne({ _id: account.userId }, { $set: { role: "admin" } });
      const second = await login();
      assert.equal(first.session.user.id, second.session.user.id);
      assert.equal(second.session.user.role, "admin");
      assert.equal(await db.collection("accounts").countDocuments(), 1);
      assert.equal(await db.collection("users").countDocuments(), 1);
    });
    await scenario("legacy UUID record is not rewritten; standard email linking reuses user", async () => {
      const user = await config.adapter.createUser({ email: profile.email, role: "user", emailVerified: null });
      const oldId = randomUUID();
      await config.adapter.linkAccount({ userId: user.id, type: "oauth", provider: "github", providerAccountId: oldId });
      const { session } = await login();
      assert.equal(session.user.id, user.id);
      assert.equal(await db.collection("users").countDocuments(), 1);
      assert.equal(await db.collection("accounts").countDocuments({ providerAccountId: oldId }), 1);
      assert.equal(await db.collection("accounts").countDocuments({ providerAccountId: String(profile.id) }), 1);
    });
    await scenario("GitHub account belonging to another user is not reassigned", async () => {
      const first = await login();
      profile = { ...profile, id: 9876543, email: "other@example.test" };
      const other = await login();
      const conflict = await login(first.jar);
      assert.match(conflict.result.headers.get("location"), /error=/);
      const account = await db.collection("accounts").findOne({ providerAccountId: String(profile.id) });
      assert.equal(account.userId.toHexString(), other.session.user.id);
    });
    await scenario("returning login does not overwrite an additional legacy string-userId record", async () => {
      const first = await login();
      const legacyId = randomUUID();
      const legacy = await db.collection("accounts").insertOne({
        userId: first.session.user.id, provider: "github", type: "oauth", providerAccountId: legacyId,
      });
      const second = await login();
      assert.equal(second.session.user.id, first.session.user.id);
      assert.equal((await db.collection("accounts").findOne({ _id: legacy.insertedId })).providerAccountId, legacyId);
      assert.equal(await db.collection("accounts").countDocuments({ providerAccountId: String(profile.id) }), 1);
    });
    await scenario("existing Google user can link GitHub through the unchanged email-linking policy", async () => {
      const user = await config.adapter.createUser({ email: profile.email, role: "user", emailVerified: null });
      await config.adapter.linkAccount({ userId: user.id, type: "oidc", provider: "google", providerAccountId: "google-subject" });
      const { session } = await login();
      assert.equal(session.user.id, user.id);
      assert.equal(await db.collection("users").countDocuments(), 1);
      assert.equal(await db.collection("accounts").countDocuments({ provider: "google" }), 1);
    });
    await scenario("missing PKCE cookie denies login and records InvalidCheck", async () => {
      const { result } = await login(new Map(), true);
      assert.match(result.headers.get("location"), /error=/);
      assert.equal(await db.collection("sessions").countDocuments(), 0);
      assert.ok(errors.some((e) => e.type === "InvalidCheck"));
    });
    await scenario("GitHub profile without an identity cannot create a random account", async () => {
      delete profile.id;
      const { result, session } = await login();
      assert.notEqual(result.headers.get("location"), `${origin}/dashboard`);
      assert.equal(session, null);
      assert.equal(await db.collection("accounts").countDocuments(), 0);
      assert.ok(errors.some((e) => e.type === "OAuthProfileParseError"));
    });
    await scenario("database lookup failure is diagnosed without leaking the error payload", async () => {
      config.adapter.getUserByAccount = async () => { throw new Error("secret-token database-password"); };
      const { result } = await login();
      assert.match(result.headers.get("location"), /error=/);
      assert.ok(errors.some((e) => e.type === "AdapterError"));
      assert.doesNotMatch(JSON.stringify(errors), /secret-token|database-password/);
    });
    await scenario("GitHub token rejection is distinguishable from database failure", async () => {
      config.providers.find((p) => p.id === "github").options[customFetch] = async () => Response.json({
        error: "incorrect_client_credentials", error_description: "secret-token",
      }, { status: 401 });
      const { result, session } = await login();
      assert.match(result.headers.get("location"), /error=/);
      assert.equal(session, null);
      assert.ok(errors.some((e) => e.code === "incorrect_client_credentials"));
      assert.doesNotMatch(JSON.stringify(errors), /secret-token/);
      assert.equal(await db.collection("sessions").countDocuments(), 0);
    });
    await scenario("unexpected OAuth issuer is rejected before token exchange", async () => {
      const { result, session } = await login(new Map(), false, "https://wrong-issuer.example.test");
      assert.match(result.headers.get("location"), /error=/);
      assert.equal(session, null);
      assert.ok(errors.some((e) => e.reason === "issuer_mismatch"));
      assert.equal(await db.collection("sessions").countDocuments(), 0);
    });
    await scenario("older callback without optional issuer remains compatible", async () => {
      const { result, session } = await login(new Map(), false, null);
      assert.equal(result.headers.get("location"), `${origin}/dashboard`);
      assert.equal(session.user.email, profile.email);
    });
  } finally {
    globalThis.fetch = baseFetch;
    await db.dropDatabase();
    await client.close();
  }
});
