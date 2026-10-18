import { MongoDBAdapter } from "@auth/mongodb-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { logAuthError } from "./lib/auth-diagnostics.mjs";
import { googleProfile } from "./lib/google-profile.mjs";

/**
 * Keep configuration independent of the live database connection for integration tests.
 * @param {import("mongodb").MongoClient | Promise<import("mongodb").MongoClient>} clientPromise
 * @param {string} databaseName
 * @returns {import("next-auth").NextAuthConfig}
 */
export function createAuthOptions(clientPromise, databaseName = "gladosdb") {
  return {
    adapter: MongoDBAdapter(clientPromise, { databaseName }),
    providers: [
      GitHub({
        // The pinned Auth.js provider omits this; GitHub now returns iss in callbacks.
        issuer: "https://github.com/login/oauth",
        allowDangerousEmailAccountLinking: true,
        profile(profile) {
          return {
            id: profile.id.toString(),
            role: profile.role ?? "user",
            image: profile.avatar_url,
            email: profile.email,
          };
        },
      }),
      Google({
        allowDangerousEmailAccountLinking: true,
        profile: googleProfile,
      }),
    ],
    logger: { error: logAuthError },
    callbacks: {
      authorized: async ({ auth }) => !!auth,
      session({ session, user }) {
        session.user.id = user.id;
        session.user.role = user.role;
        return session;
      },
      // Legacy account repairs require a verified identity mapping. Do not rewrite
      // providerAccountId using a provisional OAuth user during sign-in.
    },
  };
}
