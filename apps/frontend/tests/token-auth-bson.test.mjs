import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { loadSource } from "../app/api/cli/tests/helpers.cjs";

const uri = process.env.GLADOS_AUTH_TEST_MONGODB_URI;
if (!uri) throw new Error("Set GLADOS_AUTH_TEST_MONGODB_URI to an isolated local MongoDB URI before running token auth BSON tests");
// This suite creates and drops its own database. Never accept a production host.
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(uri)) {
  throw new Error("Tests require a credential-free loopback MongoDB URI");
}

const USER_ID = "507f1f77bcf86cd799439011";
const TOKEN = "local-token-auth-bson-test-only";
const PROFILE = { id: 13579, login: "bson-test-user", email: "bson@example.test" };

test("token auth resolves BSON user identities with real isolated MongoDB", async (t) => {
  const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
  const databaseName = `glados_token_auth_bson_test_${randomUUID().replaceAll("-", "")}`;
  const db = client.db(databaseName);

  async function scenario(name, { reference, users = [], status = 200, role, failUserReadAt }, check) {
    await t.test(name, async () => {
      await db.dropDatabase();
      await db.collection("accounts").insertOne({
        provider: "github", providerAccountId: String(PROFILE.id), userId: reference,
      });
      if (users.length) await db.collection("users").insertMany(users);
      const snapshot = async () => ({
        accounts: await db.collection("accounts").find().toArray(),
        users: await db.collection("users").find().toArray(),
      });
      const before = await snapshot();
      const reads = [], writes = [], logs = [];
      let fetches = 0;
      const mappedClient = {
        db(name) {
          assert.equal(name, "gladosdb");
          return {
            collection(collectionName) {
              assert.ok(["accounts", "users"].includes(collectionName));
              const collection = db.collection(collectionName);
              return {
                async findOne(query) {
                  reads.push({ collection: collectionName, query });
                  const readNumber = reads.filter((read) => read.collection === "users").length;
                  if (collectionName === "users" && readNumber === failUserReadAt) {
                    throw new Error(`Test read failure with ${TOKEN}`);
                  }
                  return collection.findOne(query);
                },
                async insertOne(document) {
                  writes.push(collectionName);
                  return collection.insertOne(document);
                },
              };
            },
          };
        },
      };
      const captureLog = (...args) => logs.push(args.join(" "));
      const { tokenBasedAuth } = loadSource("tokenAuth.ts", {
        "./lib/mongodb": { default: Promise.resolve(mappedClient), __esModule: true },
      }, {
        console: { log: captureLog, error: captureLog, warn: captureLog, info: captureLog, debug: captureLog },
        async fetch(url, init) {
          fetches++;
          assert.equal(url, "https://api.github.com/user");
          assert.equal(new Headers(init.headers).get("Authorization"), `Bearer ${TOKEN}`);
          return Response.json(PROFILE);
        },
      });

      const response = await tokenBasedAuth(TOKEN);
      const text = await response.text();
      const body = JSON.parse(text);
      assert.equal(response.status, status);
      if (status === 200) {
        assert.equal(body._id, USER_ID);
        assert.equal(body.role, role);
      } else {
        assert.equal(body._id, undefined);
      }
      assert.equal(fetches, 1, "Every GitHub response must come from the local mock");
      assert.equal(reads.filter((read) => read.collection === "users").length,
        failUserReadAt ?? (typeof reference === "string" ? 2 : 1));
      assert.deepEqual(writes, [], "Existing-account authentication must not write records");
      assert.deepEqual(await snapshot(), before, "Authentication must preserve the seeded records");
      assert.ok(!`${text}\n${logs.join("\n")}`.includes(TOKEN), "Credentials must not reach responses or logs");
      if (check) check(reads);
    });
  }

  try {
    await scenario("serialized reference resolves a native ObjectId and retains admin role", {
      reference: USER_ID, users: [{ _id: new ObjectId(USER_ID), role: "admin" }], role: "admin",
    }, (reads) => {
      const userReads = reads.filter((read) => read.collection === "users");
      assert.equal(userReads.length, 2);
      assert.equal(userReads[0].query._id, USER_ID);
      assert.ok(userReads[1].query._id instanceof ObjectId);
    });
    await scenario("native ObjectId reference remains exact", {
      reference: new ObjectId(USER_ID), users: [{ _id: new ObjectId(USER_ID), role: "user" }], role: "user",
    });
    await scenario("serialized reference still resolves a string user", {
      reference: USER_ID, users: [{ _id: USER_ID, role: "admin" }], role: "admin",
    });
    await scenario("uppercase reference resolves the canonical ObjectId", {
      reference: USER_ID.toUpperCase(), users: [{ _id: new ObjectId(USER_ID), role: "user" }], role: "user",
    });
    await scenario("native reference selects its typed user when a string user also exists", {
      reference: new ObjectId(USER_ID), role: "user", users: [
        { _id: USER_ID, role: "admin" }, { _id: new ObjectId(USER_ID), role: "user" },
      ],
    });
    await scenario("native reference rejects a string-only user", {
      reference: new ObjectId(USER_ID), users: [{ _id: USER_ID, role: "admin" }], status: 401,
    });
    for (const stringFirst of [true, false]) {
      const users = [{ _id: USER_ID, role: "admin" }, { _id: new ObjectId(USER_ID), role: "user" }];
      if (!stringFirst) users.reverse();
      await scenario(`ambiguous reference rejects both users with ${stringFirst ? "string" : "ObjectId"} inserted first`, {
        reference: USER_ID, users, status: 401,
      });
    }
    await scenario("neither BSON candidate can authenticate", { reference: USER_ID, status: 401 });
    for (const failUserReadAt of [1, 2]) {
      await scenario(`candidate read ${failUserReadAt} failure cannot authenticate an exact string match`, {
        reference: USER_ID, users: [{ _id: USER_ID, role: "admin" }], status: 500, failUserReadAt,
      });
    }
  } finally {
    try {
      await db.dropDatabase();
    } finally {
      await client.close();
    }
  }
});
