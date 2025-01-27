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
        profile(profile) {
          return { role: (profile as any).role ?? "user", image: profile.avatar_url, email: profile.email }
        }}),
      Google({
        profile(profile) {
          return { role: (profile as any).role ?? "user", image: profile.avatar_url, email: profile.email }
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
  },
})
