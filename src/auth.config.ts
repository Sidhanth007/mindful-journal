import type { NextAuthConfig } from "next-auth";

/**
 * Base Auth.js configuration that is safe to import from `proxy.ts`.
 * It deliberately contains no database access; the Credentials provider
 * (which needs Prisma) is added in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.sv = user.sessionVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      session.user.sv = token.sv ?? 0;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
