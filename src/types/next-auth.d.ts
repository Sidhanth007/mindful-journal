import type { DefaultSession } from "next-auth";

export type AppRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      sv: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
    sessionVersion?: number;
  }
}

// Auth.js v5 re-exports its JWT type from @auth/core, so augment the source.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    sv?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    sv?: number;
  }
}
