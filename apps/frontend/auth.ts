import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import clientPromise from "./lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, { databaseName: 'gladosdb' }),
  providers:
    [
      GitHub({
        allowDangerousEmailAccountLinking: true,
        profile(profile) {
          return { id: profile.id?.toString(), role: (profile as any).role ?? "user", image: profile.avatar_url, email: profile.email }
        }}),
      Google({
        allowDangerousEmailAccountLinking: true,
        profile(profile) {
          return { role: (profile as any).role ?? "user", image: profile.picture, email: profile.email }
        }
      })
    ],
  callbacks: {
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      // Handled in ProtectedRoute
      return !!auth
    },
    session({ session, user }) {
      session.user.id = user.id;
      (session.user as any).role = (user as any).role
      return session
    },
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "github" && profile?.id) {
        try {
          const client = await clientPromise;
          const db = client.db("gladosdb");

          const existingAccount = await db.collection("accounts").findOne({
            userId: user.id,
            provider: "github",
          });
          
          if (existingAccount) {
            const isNotProviderID =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                existingAccount.providerAccountId ?? ""
              );

            if (isNotProviderID) {
              await db.collection("accounts").updateOne(
                { _id: existingAccount._id },
                { $set: { providerAccountId: profile.id.toString() } }
              );
            }
          }

        } catch (err) {
          console.error("Failed Migration:", err);
        }
      }
      return true;
    }
  },
})
