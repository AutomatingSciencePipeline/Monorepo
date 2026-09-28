import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { MongoClient } from "mongodb";
import { Auth, customFetch } from "@auth/core";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import Google from "next-auth/providers/google";
import { googleProfile } from "../lib/google-profile.mjs";

test("Google profile rejects missing, empty, and non-string subjects", () => {
  for (const sub of [undefined, null, "", "  ", 123]) {
    assert.throws(() => googleProfile({ sub }), /valid subject/);
  }
});

const uri = process.env.GLADOS_AUTH_TEST_MONGODB_URI;
if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(uri)) {
  throw new Error("Set GLADOS_AUTH_TEST_MONGODB_URI to a credential-free loopback MongoDB URI");
}

test("Google OIDC callback and MongoDB account identity", async (t) => {
  const client = await new MongoClient(uri).connect();
  const dbName = `glados_google_test_${randomUUID().replaceAll("-", "")}`;
  const db = client.db(dbName);
  const issuer = "https://accounts.google.com";
  const origin = "http://localhost:3300";
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let claims, errors, config;
  function token() {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const data = `${encode({ alg: "RS256" })}.${encode({ iss: issuer, aud: "test-google-client", iat: now, exp: now + 300, ...claims })}`;
    return `${data}.${sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url")}`;
  }
  function setup() {
    claims = { sub: "google-subject-123", name: "Test Researcher", email: "researcher@example.test", email_verified: true, picture: "https://example.test/avatar" };
    errors = [];
    config = {
      adapter: MongoDBAdapter(client, { databaseName: dbName }),
      secret: "local-test-only-google-session-secret-32-characters",
      trustHost: true, basePath: "/api/auth",
      logger: { error: (e) => errors.push(e.type), warn() {}, debug() {} },
      providers: [Google({
        clientId: "test-google-client", clientSecret: "synthetic-secret",
        allowDangerousEmailAccountLinking: true, profile: googleProfile,
        [customFetch]: async (url) => {
          switch (new URL(url).href) {
            case `${issuer}/.well-known/openid-configuration`:
              return Response.json({ issuer, authorization_endpoint: `${issuer}/o/oauth2/v2/auth`, token_endpoint: "https://oauth2.googleapis.com/token", userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo", jwks_uri: "https://www.googleapis.com/oauth2/v3/certs", response_types_supported: ["code"], subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"], code_challenge_methods_supported: ["S256"] });
            case "https://oauth2.googleapis.com/token":
              return Response.json({ access_token: "synthetic-token", token_type: "bearer", expires_in: 3600, id_token: token() });
            default: throw new Error("Unexpected provider request in Google test");
          }
        },
      })],
      callbacks: { session({ session, user }) {
        session.user.id = user.id;
        session.user.role = user.role;
        return session;
      } },
    };
  }
  async function request(path, jar, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const response = await Auth(new Request(`${origin}/api/auth/${path}`, { ...init, headers }), config);
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const i = pair.indexOf("=");
      if (pair.slice(i + 1)) jar.set(pair.slice(0, i), pair.slice(i + 1));
      else jar.delete(pair.slice(0, i));
    }
    return response;
  }
  async function login(jar = new Map(), omitPkce = false) {
    const csrf = await (await request("csrf", jar)).json();
    const start = await request("signin/google", jar, { method: "POST", body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${origin}/dashboard` }) });
    const authorization = new URL(start.headers.get("location"));
    assert.equal(authorization.origin, issuer);
    assert.equal(authorization.searchParams.get("redirect_uri"), `${origin}/api/auth/callback/google`);
    assert.ok(authorization.searchParams.get("code_challenge"));
    if (omitPkce) for (const key of jar.keys()) if (key.includes("pkce")) jar.delete(key);
    const params = new URLSearchParams({ code: "synthetic-code", iss: issuer });
    if (authorization.searchParams.has("state")) params.set("state", authorization.searchParams.get("state"));
    const result = await request(`callback/google?${params}`, jar);
    const session = await (await request("session", jar)).json();
    return { result, session, jar };
  }
  async function scenario(name, fn) {
    await t.test(name, async () => { await db.dropDatabase(); setup(); await fn(); });
  }
  try {
    await scenario("new login stores the Google subject and display name", async () => {
      const { result, session, jar } = await login();
      assert.equal(result.headers.get("location"), `${origin}/dashboard`);
      const account = await db.collection("accounts").findOne({ provider: "google" });
      assert.equal(account.providerAccountId, claims.sub);
      assert.equal(account.userId.toHexString(), session.user.id);
      assert.equal(session.user.name, claims.name);
      assert.equal(session.user.role, "user");
      assert.equal((await (await request("session", jar)).json()).user.id, session.user.id);
      assert.deepEqual(errors, []);
    });
    await scenario("repeat login uses one account and preserves role even when email changes", async () => {
      const first = await login();
      const account = await db.collection("accounts").findOne({ provider: "google" });
      await db.collection("users").updateOne({ _id: account.userId }, { $set: { role: "admin" } });
      claims.email = "changed@example.test";
      const second = await login();
      assert.equal(second.session.user.id, first.session.user.id);
      assert.equal(second.session.user.role, "admin");
      assert.equal(await db.collection("users").countDocuments(), 1);
      assert.equal(await db.collection("accounts").countDocuments(), 1);
    });
    await scenario("Google links to an existing GitHub user without rewriting that account", async () => {
      const user = await config.adapter.createUser({ email: claims.email, role: "user", emailVerified: null });
      await config.adapter.linkAccount({ userId: user.id, type: "oauth", provider: "github", providerAccountId: "github-existing-id" });
      const { session } = await login();
      assert.equal(session.user.id, user.id);
      assert.equal(await db.collection("users").countDocuments(), 1);
      assert.equal(await db.collection("accounts").countDocuments(), 2);
      const github = await db.collection("accounts").findOne({ provider: "github" });
      assert.equal(github.providerAccountId, "github-existing-id");
      assert.equal(github.userId.toHexString(), user.id);
    });
    await scenario("another user's Google account is not reassigned", async () => {
      const first = await login();
      claims.sub = "other-subject"; claims.email = "other@example.test";
      const other = await login();
      const conflict = await login(first.jar);
      assert.match(conflict.result.headers.get("location"), /error=/);
      const account = await db.collection("accounts").findOne({ providerAccountId: claims.sub });
      assert.equal(account.userId.toHexString(), other.session.user.id);
    });
    await scenario("missing OIDC subject creates no account or session", async () => {
      delete claims.sub;
      const { result, session } = await login();
      assert.match(result.headers.get("location"), /error=/);
      assert.equal(session, null);
      assert.equal(await db.collection("accounts").countDocuments(), 0);
      assert.equal(await db.collection("sessions").countDocuments(), 0);
    });
    await scenario("incorrect token issuer is rejected", async () => {
      claims.iss = "https://wrong-issuer.example.test";
      const { result, session } = await login();
      assert.match(result.headers.get("location"), /error=/);
      assert.equal(session, null);
      assert.equal(await db.collection("accounts").countDocuments(), 0);
    });
    await scenario("missing PKCE cookie is rejected", async () => {
      const { result, session } = await login(new Map(), true);
      assert.match(result.headers.get("location"), /error=/);
      assert.equal(session, null);
      assert.ok(errors.includes("InvalidCheck"));
    });
  } finally { await db.dropDatabase(); await client.close(); }
});
