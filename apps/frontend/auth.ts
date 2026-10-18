import NextAuth from "next-auth";
import clientPromise from "./lib/mongodb";
import { createAuthOptions } from "./auth-options.mjs";

export const { handlers, signIn, signOut, auth } = NextAuth(
  createAuthOptions(clientPromise)
);
