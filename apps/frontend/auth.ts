import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Keycloak from "next-auth/providers/keycloak";
import clientPromise from "./lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {databaseName: 'gladosdb'}),
  providers: [GitHub, Keycloak],
  callbacks: {
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      // Handled in ProtectedRoute
      return !!auth
    },
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
 