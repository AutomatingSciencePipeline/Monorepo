import { ObjectId } from "mongodb";
import clientPromise from "./lib/mongodb";
import { NextResponse } from "next/server";

// Observe eager connection failures even when a request returns before awaiting it.
void Promise.resolve(clientPromise).catch(() => undefined);

type GitHubIdentity = {
    id: number;
    login: string;
    email?: string | null;
    avatar_url?: string | null;
};

type GitHubAccount = {
    _id: ObjectId | number;
    userId: ObjectId | string;
    type: string;
    provider: string;
    providerAccountId: string;
    token_type: string;
};

function isGitHubIdentity(value: unknown): value is GitHubIdentity {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const identity = value as Record<string, unknown>;
    return typeof identity.id === "number"
        && Number.isSafeInteger(identity.id)
        && identity.id > 0
        && typeof identity.login === "string"
        && identity.login.trim().length > 0
        && (identity.email == null || typeof identity.email === "string")
        && (identity.avatar_url == null || typeof identity.avatar_url === "string");
}

function isUserId(value: unknown): value is ObjectId | string {
    return value instanceof ObjectId
        || (typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value));
}

function unauthorized(): Response {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function tokenBasedAuth(token: string): Promise<Response> {
    if (typeof token !== "string" || token.trim().length === 0) {
        return unauthorized();
    }

    try {
        const client = await clientPromise;
        const userResponse = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!userResponse.ok) {
            return unauthorized();
        }

        let identity: unknown;
        try {
            identity = await userResponse.json();
        } catch {
            return unauthorized();
        }
        if (!isGitHubIdentity(identity)) {
            return unauthorized();
        }

        const db = client.db("gladosdb");
        const accounts = db.collection<GitHubAccount>("accounts");
        const account = await accounts.findOne({
            providerAccountId: identity.id.toString(),
            provider: "github",
        });

        if (account) {
            if (!isUserId(account.userId)) {
                return unauthorized();
            }
            const user = await db.collection<{ _id: ObjectId | string }>("users")
                .findOne({ _id: account.userId });
            if (!user || !isUserId(user._id)) {
                return unauthorized();
            }
            return NextResponse.json(user);
        }

        const user = {
            name: identity.login,
            email: identity.email,
            image: identity.avatar_url,
            role: "user",
        };
        const submission = await db.collection("users").insertOne(user);
        if (!submission.acknowledged || !isUserId(submission.insertedId)) {
            throw new Error("User creation failed");
        }

        const accountSubmission = await accounts.insertOne({
            _id: identity.id,
            userId: submission.insertedId,
            type: "oauth",
            provider: "github",
            providerAccountId: identity.id.toString(),
            token_type: "bearer",
        });
        if (!accountSubmission.acknowledged) {
            throw new Error("Account creation failed");
        }

        return NextResponse.json({ ...user, _id: submission.insertedId });
    } catch {
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
